import { NextRequest, NextResponse } from "next/server";
import { cleanJobDescription, trimJobDescriptionToRoleContent } from "@/app/utils/jobDescriptionCleaner";
import { generateWithFallback } from "@/app/services/model-fallback";

export const runtime = "nodejs";
export const maxDuration = 30;

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

async function scrapeJobDescription(url: string): Promise<{ text: string; title?: string } | null> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });

  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;

  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

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
  const cleaned = cleanJobDescription(rawText, { maxLength: 8000 });
  const trimmed = trimJobDescriptionToRoleContent(cleaned);

  if (trimmed.length < 150 && cleaned.length < 150) return null;
  return { text: trimmed.length >= 150 ? trimmed : cleaned, title };
}

async function extractWithLLM(url: string): Promise<string | null> {
  const prompt = `You are a job-description extractor. The user has provided a job listing URL.

URL: ${url}

Extract and return ONLY the full job description text from the job posting at that URL.
Include: job title, company name (if present), responsibilities, qualifications, and relevant role details.
Do NOT include: salary data, application forms, EEO statements, privacy notices, or company boilerplate.
Do NOT include any meta-commentary — output the job description text directly.

If you cannot access or extract meaningful job description content from this URL, respond with exactly: CANNOT_EXTRACT`;

  try {
    const result = await generateWithFallback(prompt, undefined, { maxTokens: 2000, temperature: 0 });
    const text = result.text?.trim();
    if (!text || text === "CANNOT_EXTRACT" || text.length < 100) return null;
    return text;
  } catch {
    return null;
  }
}

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
    return NextResponse.json({ error: "Invalid URL — please enter a valid http or https URL" }, { status: 400 });
  }

  // Strategy A: deterministic scrape
  try {
    const scraped = await scrapeJobDescription(url);
    if (scraped && scraped.text.length >= 150) {
      return NextResponse.json({ jobDescription: scraped.text, title: scraped.title, source: "scraped" });
    }
  } catch (err) {
    console.warn("[fetch-job-url] Scrape failed:", err instanceof Error ? err.message : err);
  }

  // Strategy B: LLM fallback
  try {
    const llmText = await extractWithLLM(url);
    if (llmText) {
      const cleaned = cleanJobDescription(llmText, { maxLength: 8000 });
      return NextResponse.json({ jobDescription: cleaned, source: "llm" });
    }
  } catch (err) {
    console.warn("[fetch-job-url] LLM extraction failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json(
    { error: "We couldn't retrieve the job description from that URL. The site may require a login or block automated access. Please paste the job description text directly." },
    { status: 422 }
  );
}
