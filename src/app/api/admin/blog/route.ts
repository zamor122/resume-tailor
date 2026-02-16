import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";

export const maxDuration = 30;

function requireAdminAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  const secret =
    process.env.BLOG_ADMIN_SECRET || process.env.CRON_SECRET;
  const expectedAuth = secret ? `Bearer ${secret}` : null;

  if (!expectedAuth || authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: "Unauthorized. Set BLOG_ADMIN_SECRET or CRON_SECRET." },
      { status: 401 }
    );
  }
  return null;
}

function sanitizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    || "blog-post";
}

/**
 * GET /api/admin/blog?health=1 - Quick health check (table exists, can read)
 * GET /api/admin/blog - List all blog posts (for debugging)
 */
export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const isHealthCheck = req.nextUrl.searchParams.get("health") === "1";

  try {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .limit(1);

    if (error) {
      console.error("[admin-blog] DB error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "blog_posts table unreachable",
          details: error.message,
          hint: "Run migration: supabase/migrations/20250213000000_create_blog_posts.sql",
        },
        { status: 500 }
      );
    }

    if (isHealthCheck) {
      return NextResponse.json({
        ok: true,
        tableExists: true,
        postCount: (data || []).length >= 0,
      });
    }

    const { data: posts, error: listError } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, published_at, created_at")
      .order("published_at", { ascending: false });

    if (listError) {
      return NextResponse.json(
        { error: "Failed to list posts", details: listError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      count: (posts || []).length,
      posts: posts || [],
    });
  } catch (err) {
    console.error("[admin-blog] Error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/blog - Create a blog post manually
 * Body: { title, slug?, description, summary, body }
 */
export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { title, slug: rawSlug, description, summary, body: postBody } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid title" },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid description" },
        { status: 400 }
      );
    }
    if (!summary || typeof summary !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid summary" },
        { status: 400 }
      );
    }
    if (!postBody || typeof postBody !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid body" },
        { status: 400 }
      );
    }

    let slug = rawSlug
      ? sanitizeSlug(String(rawSlug))
      : sanitizeSlug(title);
    if (!slug) slug = "blog-post";

    const { data: existing } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      slug = `${slug}-${dateSuffix}`;
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("blog_posts")
      .insert({
        slug,
        title: title.trim(),
        description: description.trim(),
        summary: summary.trim(),
        body: postBody.trim(),
      })
      .select("id, slug, title, published_at")
      .single();

    if (insertError) {
      console.error("[admin-blog] Insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to save blog post", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      post: inserted,
      url: `/blog/${inserted.slug}`,
    });
  } catch (err) {
    console.error("[admin-blog] Error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}
