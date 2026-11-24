import { supabaseAdmin } from "@/app/lib/supabase/server";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  summary: string;
  body: string;
  published_at: string;
  created_at: string;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, description, summary, body, published_at, created_at")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("[blog] getAllPosts error:", error);
      return [];
    }
    return (data || []) as BlogPost[];
  } catch (err) {
    console.error("[blog] getAllPosts error:", err);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, description, summary, body, published_at, created_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[blog] getPostBySlug error:", error);
      return null;
    }
    return data as BlogPost | null;
  } catch (err) {
    console.error("[blog] getPostBySlug error:", err);
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("slug")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("[blog] getAllSlugs error:", error);
      return [];
    }
    return (data || []).map((r) => r.slug);
  } catch (err) {
    console.error("[blog] getAllSlugs error:", err);
    return [];
  }
}

export async function getRelatedPosts(currentSlug: string, limit = 3): Promise<Pick<BlogPost, "slug" | "title" | "description" | "published_at">[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("slug, title, description, published_at")
      .neq("slug", currentSlug)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[blog] getRelatedPosts error:", error);
      return [];
    }
    return (data || []) as Pick<BlogPost, "slug" | "title" | "description" | "published_at">[];
  } catch (err) {
    console.error("[blog] getRelatedPosts error:", err);
    return [];
  }
}
