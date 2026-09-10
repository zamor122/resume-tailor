import { NextRequest, NextResponse } from "next/server";
import { cleanJobDescription } from "@/app/utils/jobDescriptionCleaner";
import { generateWithFallback } from "@/app/services/model-fallback";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─── Sentinel-based trim (end only, not start) ──────────────────────────────
// Only trim boilerplate that appears AFTER the job content.
// We intentionally skip the "start" trimming that cut off content earlier.
const END_SENTINELS = [
  "Voluntary Self-Identification",
  "Equal Employment Opportunity",
  "EEO Policy",
  "PUBLIC BURDEN STATEMENT",
  "OMB Control Number",
  "Candidate data privacy",
  "applicant-privacy",
  "Privacy Policy:",
  "Country Hiring Guidelines:",
  "Create a Job Alert",
  "Apply for this job",
  "First Name*",
  "Resume/CV*",
  "No file chosen",
  "Powered by Greenhouse",
  "Powered by Lever",
  "Powered by Workday",
];

function softTrimJobDescription(text: string): string {
  const lower = text.toLowerCase();
  let minIdx = text.length;
  for (const sentinel of END_SENTINELS) {
    const idx = lower.indexOf(sentinel.toLowerCase());
    if (idx > 200 && idx < minIdx) minIdx = idx;
  }
  return text.slice(0, minIdx).trim();
}

// ─── HTML → plain text ───────────────────────────────────────────────────────
function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|h[1-6]|section|article|main|aside|blockquote)[^>]*>/gi, "\n");

  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));

  text = text
    .split("\n")
    .map((line: string) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return text.trim();
}

// ─── Strategy A: Jina AI Reader (handles JS-rendered pages) ─────────────────
// Jina renders the page like a browser and returns clean markdown/text.
// Free to use, no API key required for basic usage.
async function fetchViaJina(url: string): Promise<{ text: string; title?: string } | null> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(jinaUrl, {
    headers: {
      Accept: "text/plain",
      "X-Return-Format": "text",
    },
    signal: AbortSignal.timeout(18_000),
  });

  if (!res.ok) return null;

  const raw = await res.text();
  if (!raw || raw.length < 200) return null;

  // Extract title from Jina's "Title:" header line if present
  let title: string | undefined;
  const titleMatch = raw.match(/^Title:\s*(.+)/m);
  if (titleMatch) title = titleMatch[1].trim();

  // Jina prepends some metadata lines; strip them (URL:, Title:, Published:, etc.)
  const body = raw.replace(/^(Title|URL|Published|Source|Description):\s*.+\n?/gm, "").trim();

  const trimmed = softTrimJobDescription(body);
  const cleaned = cleanJobDescription(trimmed, { maxLength: 10000 });

  if (cleaned.length < 200) return null;
  return { text: cleaned, title };
}

// ─── Strategy B: Direct HTML fetch (works for server-rendered pages) ─────────
async function scrapeDirectly(url: string): Promise<{ text: string; title?: string } | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });

  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;

  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  // Try content-specific regions first
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*(?:job[-_]?description|job[-_]?details|job[-_]?content|posting-content|description-content)[^>]*>([\s\S]*?)<\/div>/i,
  ];

  let mainHtml = "";
  for (const pattern of mainPatterns) {
    const match = html.match(pattern);
    if (match) { mainHtml = match[1]; break; }
  }

  const rawText = htmlToText(mainHtml || html);
  const trimmed = softTrimJobDescription(rawText);
  const cleaned = cleanJobDescription(trimmed, { maxLength: 10000 });

  if (cleaned.length < 200) return null;
  return { text: cleaned, title };
}

// ─── Strategy C: LLM extraction (last resort) ────────────────────────────────
async function extractWithLLM(url: string): Promise<string | null> {
  const prompt = `You are a job-description extractor. The user has provided a job listing URL.

URL: ${url}

Extract and return ONLY the full job description text from the job posting at that URL.
Include: job title, company name (if present), responsibilities, qualifications, and relevant role details.
Do NOT include: salary data, application forms, EEO statements, privacy notices, or company boilerplate.
Do NOT add any commentary — output the job description text directly.

If you cannot access or extract meaningful content from this URL, respond with exactly: CANNOT_EXTRACT`;

  try {
    const result = await generateWithFallback(prompt, undefined, { maxTokens: 2500, temperature: 0 });
    const text = result.text?.trim();
    if (!text || text === "CANNOT_EXTRACT" || text.length < 150) return null;
    return text;
  } catch {
    return null;
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = body.url?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json(
      { error: "Invalid URL — please enter a valid http or https URL" },
      { status: 400 }
    );
  }

  // Strategy A: Jina Reader (handles JS-rendered pages like LinkedIn, Greenhouse, Built In, etc.)
  try {
    const jina = await fetchViaJina(url);
    if (jina && jina.text.length >= 200) {
      console.log(`[fetch-job-url] Jina success: ${jina.text.length} chars`);
      return NextResponse.json({ jobDescription: jina.text, title: jina.title, source: "scraped" });
    }
  } catch (err) {
    console.warn("[fetch-job-url] Jina failed:", err instanceof Error ? err.message : err);
  }

  // Strategy B: Direct scrape (works for simpler/server-rendered pages)
  try {
    const scraped = await scrapeDirectly(url);
    if (scraped && scraped.text.length >= 200) {
      console.log(`[fetch-job-url] Direct scrape success: ${scraped.text.length} chars`);
      return NextResponse.json({ jobDescription: scraped.text, title: scraped.title, source: "scraped" });
    }
  } catch (err) {
    console.warn("[fetch-job-url] Direct scrape failed:", err instanceof Error ? err.message : err);
  }

  // Strategy C: LLM extraction (last resort)
  try {
    const llmText = await extractWithLLM(url);
    if (llmText) {
      const cleaned = cleanJobDescription(llmText, { maxLength: 10000 });
      console.log(`[fetch-job-url] LLM extraction success: ${cleaned.length} chars`);
      return NextResponse.json({ jobDescription: cleaned, source: "llm" });
    }
  } catch (err) {
    console.warn("[fetch-job-url] LLM extraction failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json(
    {
      error:
        "We couldn't retrieve the job description from that URL. The site may require a login or block automated access. Please paste the job description text directly.",
    },
    { status: 422 }
  );
}
