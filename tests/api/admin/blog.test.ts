import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/blog/route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SECRET_KEY = "test-secret-key";

const mockPosts = [
  { id: "p1", slug: "first-post", title: "First", published_at: "2025-01-01", created_at: "2025-01-01" },
];

vi.mock("@/app/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {
        select: () => ({
          limit: () =>
            Promise.resolve({ data: [], error: null }),
          order: () =>
            Promise.resolve({ data: mockPosts, error: null }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: "new-id", slug: "test-post", title: "Test Post", published_at: "2025-01-01" },
                error: null,
              }),
          }),
        }),
      };
      return chain;
    }),
  },
}));

describe("Admin Blog API", () => {
  const authHeader = { Authorization: "Bearer test-secret" };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("should return 401 when auth is missing", async () => {
    delete process.env.CRON_SECRET;
    delete process.env.BLOG_ADMIN_SECRET;
    const req = new NextRequest("http://localhost:3000/api/admin/blog");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 when auth is wrong", async () => {
    process.env.CRON_SECRET = "other-secret";
    const req = new NextRequest("http://localhost:3000/api/admin/blog", {
      headers: authHeader,
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should list posts when authenticated", async () => {
    process.env.CRON_SECRET = "test-secret";
    const req = new NextRequest("http://localhost:3000/api/admin/blog", {
      headers: authHeader,
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.posts).toBeDefined();
  });

  it("should create a blog post via POST", async () => {
    process.env.CRON_SECRET = "test-secret";
    const req = new NextRequest("http://localhost:3000/api/admin/blog", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Post",
        description: "A test.",
        summary: "Test summary.",
        body: "## Body\n\nContent here.",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.post).toBeDefined();
    expect(json.url).toMatch(/^\/blog\//);
  });

  it("should return 400 when title is missing", async () => {
    process.env.CRON_SECRET = "test-secret";
    const req = new NextRequest("http://localhost:3000/api/admin/blog", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "A test.",
        summary: "Test.",
        body: "Body.",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
