import { describe, it, expect } from "vitest";
import { extractIPAddress } from "@/app/utils/clientIp";

// Minimal structural stand-in for NextRequest (the helper only reads headers).
const req = (headers: Record<string, string>) => ({
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
});

describe("extractIPAddress — trust order", () => {
  it("prefers cf-connecting-ip (set by the edge; not client-forwardable)", () => {
    expect(
      extractIPAddress(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }))
    ).toBe("203.0.113.7");
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(
      extractIPAddress(req({ "x-real-ip": "198.51.100.5", "x-forwarded-for": "1.2.3.4" }))
    ).toBe("198.51.100.5");
  });

  it("uses the RIGHTMOST x-forwarded-for entry, never the client-supplied leftmost", () => {
    // An attacker prepends their own value; the trusted proxy appends the real client on the right.
    // Returning the leftmost (the old behaviour) let anyone forge their identity.
    expect(extractIPAddress(req({ "x-forwarded-for": "1.2.3.4, 198.51.100.9" }))).toBe(
      "198.51.100.9"
    );
  });

  it("returns 'unknown' when no IP header is present", () => {
    expect(extractIPAddress(req({}))).toBe("unknown");
  });
});
