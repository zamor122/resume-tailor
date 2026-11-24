import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { generateContentWithFallback } from "@/app/services/ai-provider";
import { parseBlogPostResponse, type BlogPostPayload } from "@/app/utils/blogPostParser";
import { pickNextSeoTopic, type BlogSeoTopic } from "@/app/config/blogSeoTopics";

export const maxDuration = 60;

// Explicitly use Google Gemini Free Tier ($0 spend, high throughput, strong SEO prose)
const BLOG_MODEL_KEY = "gemini:gemini-2.5-flash";
const BLOG_FALLBACK_MODELS = ["gemini:gemini-2.5-flash-lite"];

function sanitizeSlug(s: string): string {
  const sanitized = s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return sanitized || "blog-post";
}

const BLOG_PROMPT = (
  existingSummaries: string[],
  date: string,
  isRetry: boolean,
  topic: BlogSeoTopic | null
) => `You are a senior SEO content strategist and career writer. Write a high-ranking, deeply actionable SEO blog post (900-1,300 words) for airesumetailor.com. Today's date: ${date}.
${isRetry ? "Try again with a sharper angle and strictly valid JSON output. " : ""}

${
  topic
    ? `ASSIGNED HIGH-INTENT SEO TARGET (follow strictly):
- Primary Keyword: "${topic.primaryKeyword}"
- Secondary Keywords to weave naturally: ${topic.secondaryKeywords.map((k) => `"${k}"`).join(", ")}
- Preferred URL Slug: "${topic.slugHint}"
- Searcher Intent: ${topic.searchIntent}
- Required Internal Links to include naturally in Markdown: https://airesumetailor.com, ${topic.targetInternalLinks.join(", ")}`
    : `Choose a specific, high-search-intent long-tail query about ATS resume tailoring, role-specific resume keywords, or beating ATS scanners that job seekers actively Google and is NOT covered below.
- Required Internal Links to include naturally in Markdown: https://airesumetailor.com, /resume-optimizer, /keywords, /alternatives, /pricing`
}

EXISTING ARTICLES (do NOT repeat these topics or titles):
${existingSummaries.length ? existingSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n") : "None yet - this is the first article."}

SEO & CONTENT REQUIREMENTS:
1. Put the exact Primary Keyword in the SEO title (under 62 chars), slug, meta description (140-155 chars), opening 2 sentences, and at least 2 H2 headings.
2. Skip generic fluff ("In today's competitive job market..."). Start with a sharp, concrete hook addressing the searcher's exact pain point.
3. Include at least TWO concrete **Before / After** resume bullet transformations (weak generic bullet vs. keyword-rich, quantified ATS-ready bullet).
4. Include scannable bullet lists, clear H2/H3 structure, and practical steps readers can apply immediately.
5. Include a "## Frequently Asked Questions" section near the end with exactly 3 "People Also Ask" style questions formatted as:
   ### Question here?
   Concise 2-3 sentence direct answer.
6. Naturally weave in how AI Resume Tailor (free first resume tailor, no credit card, no recurring monthly subscription traps) solves this workflow in under 60 seconds, with a closing CTA.

Output valid JSON ONLY (escape all newlines inside "body" as \\n):
{
  "title": "SEO-optimized title containing primary keyword",
  "slug": "${topic ? topic.slugHint : "url-safe-lowercase-slug"}",
  "description": "140-155 char meta description with primary keyword and clear benefit",
  "summary": "One sentence summarizing the primary keyword and angle covered.",
  "body": "Full Markdown article (900-1,300 words) including Before/After examples, internal links, and ## Frequently Asked Questions with 3 ### Q&As."
}`;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (!expectedAuth || authHeader !== expectedAuth) {
    console.error("[blog-cron] Unauthorized: missing or invalid CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data: todayPost } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .gte("published_at", `${today}T00:00:00Z`)
      .lte("published_at", `${today}T23:59:59.999Z`)
      .limit(1)
      .maybeSingle();

    if (todayPost) {
      console.log("[blog-cron] Skipped: already generated today");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already_generated_today",
      });
    }

    const { data: recentPosts } = await supabaseAdmin
      .from("blog_posts")
      .select("slug, summary")
      .order("published_at", { ascending: false })
      .limit(60);

    const existingSlugs = (recentPosts || []).map((r) => r.slug).filter(Boolean);
    const existingSummaries = (recentPosts || [])
      .slice(0, 30)
      .map((r) => r.summary)
      .filter(Boolean);
    const selectedTopic = pickNextSeoTopic(existingSlugs, existingSummaries);

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const runGeneration = async (isRetry: boolean) => {
      const prompt = BLOG_PROMPT(existingSummaries, dateStr, isRetry, selectedTopic);
      const result = await generateContentWithFallback(
        prompt,
        BLOG_MODEL_KEY,
        {
          maxTokens: 3200,
          temperature: 0.65,
        },
        undefined,
        BLOG_FALLBACK_MODELS
      );
      const parsed = parseBlogPostResponse(result.text);
      if (!parsed) {
        throw new Error("Invalid or incomplete LLM response");
      }
      return parsed;
    };

    let payload: Required<BlogPostPayload>;
    try {
      payload = await runGeneration(false);
    } catch (err) {
      console.warn("[blog-cron] First attempt failed, retrying:", err);
      try {
        payload = await runGeneration(true);
      } catch (retryErr) {
        console.error("[blog-cron] Both attempts failed:", retryErr);
        return NextResponse.json(
          { error: "Failed to generate blog post", details: String(retryErr) },
          { status: 500 }
        );
      }
    }

    let slug = sanitizeSlug(payload.slug);
    if (!slug) slug = sanitizeSlug(payload.title);

    const { data: existing } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      slug = `${slug}-${dateSuffix}`;
    }

    const { error: insertError } = await supabaseAdmin.from("blog_posts").insert({
      slug,
      title: payload.title,
      description: payload.description,
      summary: payload.summary,
      body: payload.body,
    });

    if (insertError) {
      console.error("[blog-cron] Insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to save blog post", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("[blog-cron] Success:", { slug, title: payload.title });
    return NextResponse.json({ success: true, slug, title: payload.title });
  } catch (err) {
    console.error("[blog-cron] Error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}
