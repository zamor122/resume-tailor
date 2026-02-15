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
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, description, summary, body, published_at, created_at")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[blog] getAllPosts error:", error);
    return [];
  }
  return (data || []) as BlogPost[];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
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
}

export async function getAllSlugs(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("slug")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[blog] getAllSlugs error:", error);
    return [];
  }
  return (data || []).map((r) => r.slug);
}
