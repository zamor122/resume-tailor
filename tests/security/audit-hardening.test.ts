import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { safeJsonLd } from "@/app/utils/safeJsonLd";
import { timingSafeEqualString } from "@/app/utils/timingSafe";
import { middleware } from "@/middleware";
import { POST as POST_SESSION } from "@/app/api/mcp/session-manager/route";
import { POST as POST_WELCOME } from "@/app/api/email/welcome/route";
import { POST as POST_RETRIEVE } from "@/app/api/resume/retrieve/route";
import { GET as GET_DRIP, POST as POST_DRIP } from "@/app/api/cron/drip/route";

const mockRequireAuth = vi.fn();
const mockRequireAuthWithEmail = vi.fn();
const mockFrom = vi.fn();
const mockGetUserById = vi.fn();
const mockUpdateUserById = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/app/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireAuthWithEmail: (...args: unknown[]) => mockRequireAuthWithEmail(...args),
  verifyUserIdMatch: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/app/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
  },
}));

vi.mock("@/app/services/emailService", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/app/utils/accessManager", () => ({
  getAccessInfoServer: vi.fn().mockResolvedValue({ hasAccess: false }),
  isWithinFreeResumeLimitServer: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/app/services/dripSequenceService", () => ({
  processDripSequence: vi.fn().mockResolvedValue({ sent: 0 }),
}));

describe("Security Audit Hardening Regressions", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "super-secret-cron-token";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  describe("M1: safeJsonLd escapes script breakout sequences", () => {
    it("escapes <, >, and & inside serialized JSON-LD", () => {
      const payload = {
        headline: 'Test </script><script>alert("xss")</script> & more',
      };
      const output = safeJsonLd(payload);
      expect(output).not.toContain("</script>");
      expect(output).not.toContain("<script>");
      expect(output).toContain("\\u003c/script\\u003e");
      expect(JSON.parse(output)).toEqual(payload);
    });
  });

  describe("M3: timingSafeEqualString & fail-closed cron auth", () => {
    it("compares strings accurately", () => {
      expect(timingSafeEqualString("Bearer abc123", "Bearer abc123")).toBe(true);
      expect(timingSafeEqualString("Bearer abc124", "Bearer abc123")).toBe(false);
      expect(timingSafeEqualString("Bearer abc", "Bearer abc123")).toBe(false);
      expect(timingSafeEqualString(null, "Bearer abc123")).toBe(false);
    });

    it("rejects unauthenticated GET and POST on /api/cron/drip", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/cron/drip", {
        method: "GET",
      });
      const getRes = await GET_DRIP(getReq);
      expect(getRes.status).toBe(401);

      const postReq = new NextRequest("http://localhost:3000/api/cron/drip", {
        method: "POST",
        body: JSON.stringify({ targetEmail: "victim@example.com" }),
      });
      const postRes = await POST_DRIP(postReq);
      expect(postRes.status).toBe(401);
    });

    it("fails closed when CRON_SECRET is unset", async () => {
      delete process.env.CRON_SECRET;
      const getReq = new NextRequest("http://localhost:3000/api/cron/drip", {
        method: "GET",
      });
      const getRes = await GET_DRIP(getReq);
      expect(getRes.status).toBe(401);
    });
  });

  describe("C2: /api/email/welcome open relay & spam prevention", () => {
    it("rejects unauthenticated requests with 401", async () => {
      mockRequireAuthWithEmail.mockResolvedValueOnce({
        error: Response.json({ error: "Authentication required." }, { status: 401 }),
      });
      const req = new NextRequest("http://localhost:3000/api/email/welcome", {
        method: "POST",
        body: JSON.stringify({ to: "victim@example.com", name: "Spam" }),
      });
      const res = await POST_WELCOME(req);
      expect(res.status).toBe(401);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("ignores forged body.to and sends strictly to authenticated user email", async () => {
      mockRequireAuthWithEmail.mockResolvedValueOnce({
        userId: "user-abc",
        email: "realuser@example.com",
      });
      mockGetUserById.mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
      });
      mockSendEmail.mockResolvedValueOnce({ success: true, id: "msg_1" });
      mockUpdateUserById.mockResolvedValueOnce({ data: {}, error: null });

      const req = new NextRequest("http://localhost:3000/api/email/welcome", {
        method: "POST",
        body: JSON.stringify({ to: "victim@example.com", name: "Attacker" }),
      });
      const res = await POST_WELCOME(req);
      expect(res.status).toBe(200);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "realuser@example.com" })
      );
    });

    it("skips sending if welcome email was already sent to this user", async () => {
      mockRequireAuthWithEmail.mockResolvedValueOnce({
        userId: "user-abc",
        email: "realuser@example.com",
      });
      mockGetUserById.mockResolvedValueOnce({
        data: { user: { user_metadata: { welcome_sent_at: "2026-11-24T00:00:00Z" } } },
      });

      const req = new NextRequest("http://localhost:3000/api/email/welcome", {
        method: "POST",
        body: JSON.stringify({ name: "Repeat" }),
      });
      const res = await POST_WELCOME(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("C4: /api/mcp/session-manager auth & ownership", () => {
    it("rejects unauthenticated requests with 401", async () => {
      mockRequireAuth.mockResolvedValueOnce({
        error: Response.json({ error: "Authentication required." }, { status: 401 }),
      });
      const req = new NextRequest("http://localhost:3000/api/mcp/session-manager", {
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      });
      const res = await POST_SESSION(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when reading another user's session", async () => {
      mockRequireAuth.mockResolvedValueOnce({ userId: "attacker-user" });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { data: { sessionId: "session-victim" }, user_id: "victim-user" },
          error: null,
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/mcp/session-manager", {
        method: "POST",
        body: JSON.stringify({ action: "get", sessionId: "session-victim" }),
      });
      const res = await POST_SESSION(req);
      expect(res.status).toBe(403);
    });
  });

  describe("H1: /api/resume/retrieve anonymous session binding", () => {
    it("returns 403 when retrieving an anonymous resume without matching sessionId", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "anon-resume-1",
            user_id: null,
            session_id: "secret-session-xyz",
            original_content: "Private PII",
            obfuscated_content: "Obfuscated",
          },
          error: null,
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/resume/retrieve", {
        method: "POST",
        body: JSON.stringify({ resumeId: "anon-resume-1" }),
      });
      const res = await POST_RETRIEVE(req);
      expect(res.status).toBe(403);
    });

    it("allows retrieving an anonymous resume when sessionId matches", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "anon-resume-1",
            user_id: null,
            session_id: "secret-session-xyz",
            original_content: "My Resume",
            obfuscated_content: "Obfuscated",
            content_map: [],
            improvement_metrics: {},
          },
          error: null,
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/resume/retrieve", {
        method: "POST",
        body: JSON.stringify({
          resumeId: "anon-resume-1",
          sessionId: "secret-session-xyz",
        }),
      });
      const res = await POST_RETRIEVE(req);
      expect(res.status).toBe(200);
    });
  });

  describe("H2 & H3: middleware rate limiting", () => {
    it("enforces tighter 30 req/min limit on /api/tools/* routes", () => {
      const testIp = "198.51.100.42";
      let status = 200;
      for (let i = 0; i < 31; i++) {
        const req = new NextRequest("http://localhost:3000/api/tools/ats-score", {
          headers: { "x-forwarded-for": testIp },
        });
        const res = middleware(req);
        status = res.status;
      }
      expect(status).toBe(429);
    });

    it("rate-limits /api/stripe/verify-payment instead of exempting all /api/stripe/*", () => {
      const testIp = "198.51.100.77";
      let status = 200;
      for (let i = 0; i < 121; i++) {
        const req = new NextRequest("http://localhost:3000/api/stripe/verify-payment", {
          headers: { "x-forwarded-for": testIp },
        });
        const res = middleware(req);
        status = res.status;
      }
      expect(status).toBe(429);
    });

    it("keeps /api/stripe/webhook exempt from rate limiting", () => {
      const testIp = "198.51.100.99";
      for (let i = 0; i < 130; i++) {
        const req = new NextRequest("http://localhost:3000/api/stripe/webhook", {
          headers: { "x-forwarded-for": testIp },
        });
        const res = middleware(req);
        expect(res.status).toBe(200);
      }
    });

    it("rewrites futureproof.airesumetailor.com/ to /futureproof", () => {
      const req = new NextRequest("https://futureproof.airesumetailor.com/", {
        headers: { host: "futureproof.airesumetailor.com" },
      });
      const res = middleware(req);
      expect(res.headers.get("x-middleware-rewrite")).toContain("/futureproof");
    });

    it("enforces tighter 30 req/min limit on /api/futureproof/* routes", () => {
      const testIp = "198.51.100.123";
      let status = 200;
      for (let i = 0; i < 31; i++) {
        const req = new NextRequest("http://localhost:3000/api/futureproof/analyze", {
          headers: { "x-forwarded-for": testIp },
        });
        const res = middleware(req);
        status = res.status;
      }
      expect(status).toBe(429);
    });
  });
});
