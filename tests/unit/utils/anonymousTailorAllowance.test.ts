import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockSingle = vi.fn();

vi.mock("@/app/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

vi.mock("@/app/utils/apiRateLimiter", () => ({
  extractIPAddress: () => "203.0.113.42",
  hashIPAddress: async (ip: string) => `hash_${ip}`,
}));

import { checkAnonymousTailorAllowed } from "@/app/utils/anonymousTailorAllowance";

describe("anonymousTailorAllowance (1 lifetime preview per IP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows first-time anonymous IP when no record exists", async () => {
    mockSingle.mockResolvedValue({ data: null });
    const res = await checkAnonymousTailorAllowed({} as NextRequest);
    expect(res.allowed).toBe(true);
  });

  it("blocks anonymous IP permanently once 1 lifetime preview was recorded (even >24h ago)", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    mockSingle.mockResolvedValue({ data: { last_used_at: thirtyDaysAgo }, error: null });
    const res = await checkAnonymousTailorAllowed({} as NextRequest);
    expect(res.allowed).toBe(false);
  });

  it("fails closed (blocks anonymous run) if Supabase returns a table/schema error such as PGRST205", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find table anonymous_tailors" },
    });
    const res = await checkAnonymousTailorAllowed({} as NextRequest);
    expect(res.allowed).toBe(false);
    errSpy.mockRestore();
  });
});
