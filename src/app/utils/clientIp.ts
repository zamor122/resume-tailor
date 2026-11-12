/**
 * Client IP extraction with an explicit TRUST ORDER.
 *
 * Only headers that the edge/proxy sets are trustworthy:
 *   cf-connecting-ip — Cloudflare sets this to the true client; not client-forwardable.
 *   x-real-ip        — Vercel's edge sets this to the true client.
 *   x-forwarded-for  — is APPENDED to, so its LEFTMOST value is whatever the client sent.
 *
 * The previous implementation returned XFF[0], so any caller could forge their identity
 * with one header and bypass every per-IP limit (and the anonymous free-preview cap).
 *
 * Deliberately dependency-free (reads headers only) so Edge middleware can import it
 * without pulling in the analytics/tracker modules that live alongside apiRateLimiter.
 */

type HeaderCarrier = { headers: { get(name: string): string | null } };

export function extractIPAddress(req: HeaderCarrier): string {
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();

  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    // Rightmost = appended by the closest trusted proxy (the real client).
    return ips[ips.length - 1] || "unknown";
  }

  return "unknown";
}
