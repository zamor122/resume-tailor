/**
 * Get the site URL for auth redirects and other URL-sensitive operations.
 * Uses env vars for explicit control; falls back to window.location for client-side.
 *
 * Set NEXT_PUBLIC_SITE_URL in production (https://airesumetailor.com).
 * Vercel auto-sets NEXT_PUBLIC_VERCEL_URL for preview deployments.
 */
export function getURL(): string {
  let url: string;
  if (typeof window !== "undefined") {
    url =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : window.location.origin);
  } else {
    url =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000");
  }
  url = url.startsWith("http") ? url : `https://${url}`;
  return url.endsWith("/") ? url : `${url}/`;
}
