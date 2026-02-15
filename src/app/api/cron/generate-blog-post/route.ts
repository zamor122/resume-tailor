import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { generateContentWithFallback } from "@/app/services/ai-provider";
import { parseJSONFromText } from "@/app/utils/json-extractor";

export const maxDuration = 120;

function sanitizeSlug(s: string): string {
  const sanitized = s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return sanitized || "blog-post";
}

const BLOG_PROMPT = (existingSummaries: string[], date: string, isRetry: boolean) => `You are a professional resume and career writer. Write an SEO-optimized blog post (500-800 words) for airesumetailor.com. Today's date: ${date}.
${isRetry ? "Try again with a different topic. " : ""}

EXISTING ARTICLES (do NOT repeat these topics, structures, or angles):
${existingSummaries.length ? existingSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n") : "None yet - this is the first article."}

Choose a specific, unique angle about resume tailoring, ATS optimization, job search, or career advice that would rank well and is NOT covered above.

CRITICAL: The article MUST relate back to AI Resume Tailor. Weave in how our free tool helps with resume optimization, job description matching, or ATS-friendly tailoring. Include at least one natural mention and a closing CTA. The body will be rendered with a "Get Started" button at the bottom, but the prose should still lead readers toward trying our tool.

Output valid JSON only:
{
  "title": "Catchy SEO title",
  "slug": "url-safe-lowercase-slug",
  "description": "1-2 sentence meta description",
  "summary": "One sentence summarizing what this article covers (for our records).",
  "body": "Markdown content. Relate to AI Resume Tailor. Include internal links to https://airesumetailor.com and /resume-optimizer."
}`;

interface BlogPostPayload {
  title?: string;
  slug?: string;
  description?: string;
  summary?: string;
  body?: string;
}

function isValidPayload(p: BlogPostPayload): p is Required<BlogPostPayload> {
  return (
    typeof p?.title === "string" &&
    p.title.length > 0 &&
    typeof p?.slug === "string" &&
    p.slug.length > 0 &&
    typeof p?.description === "string" &&
    p.description.length > 0 &&
    typeof p?.summary === "string" &&
    p.summary.length > 0 &&
    typeof p?.body === "string" &&
    p.body.length > 0
  );
}

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
      .lt("published_at", `${today}T23:59:59Z`)
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

    const { data: summaries } = await supabaseAdmin
      .from("blog_posts")
      .select("summary")
      .order("published_at", { ascending: false })
      .limit(50);

    const existingSummaries = (summaries || []).map((r) => r.summary).filter(Boolean);
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const runGeneration = async (isRetry: boolean) => {
      const prompt = BLOG_PROMPT(existingSummaries, dateStr, isRetry);
      const result = await generateContentWithFallback(prompt);
      const parsed = parseJSONFromText<BlogPostPayload>(result.text);
      if (!parsed || !isValidPayload(parsed)) {
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
