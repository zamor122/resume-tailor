import { NextRequest, NextResponse } from "next/server";
import { extractIPAddress } from "@/app/utils/clientIp";

/**
 * Central abuse backstop for the API surface.
 *
 * ~30 routes (the free tools, the MCP helpers, and the agent/LLM routes) execute an LLM
 * but had NO auth and NO rate limit, so anyone could loop them and burn the shared
 * free-tier quota — taking paying customers down with it. Editing 30 handlers would miss
 * the next one someone adds, so the limit is enforced once, here, for the whole surface.
 *
 * Thresholds are deliberately generous: they stop a LOOP (thousands of requests a minute),
 * not legitimate use. The free-tool pipeline legitimately fires ~6 requests for one user
 * action, so a tight per-minute cap would break the product.
 *
 * Payments and cron are exempt: /api/stripe/webhook must never be throttled (Stripe retries,
 * and it is signature-verified) and /api/cron/* is secret-gated.
 *
 * KNOWN LIMITATION (stated, not hidden): this counter is in-process, so on serverless it is
 * per-instance and resets on cold start. It bounds ordinary abuse; it does NOT give a global
 * budget. A guaranteed global cap needs a shared store (Supabase/Redis) — that, and the
 * free-tier provider quota itself, is what actually sets the ceiling on traffic.
 */
// Only Stripe's signature-verified webhook and secret-gated cron/admin endpoints are exempt.
// Interactive Stripe endpoints (/api/stripe/verify-payment, create-checkout, create-portal-session)
// MUST remain rate-limited to prevent session-ID enumeration and Stripe API quota abuse.
const EXEMPT_PREFIXES = ["/api/stripe/webhook", "/api/cron/", "/api/admin/"];

// Unauthenticated LLM / scraping / AI-detection routes receive a tighter per-IP budget
// so a single IP cannot rapidly exhaust shared free-tier LLM quotas.
const TIGHT_LLM_PREFIXES = [
  "/api/tools/",
  "/api/mcp-tools/",
  "/api/fetch-job-url",
  "/api/ai-detection",
  "/api/elicitation/",
  "/api/research-company",
  "/api/tailor/job/title",
];

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MAX_PER_MINUTE = 120;
const MAX_PER_DAY = 2000;
const TIGHT_MAX_PER_MINUTE = 30;
const TIGHT_MAX_PER_DAY = 200;

const hits = new Map<string, number[]>();

function tooMany(bucketKey: string, maxPerMinute: number, maxPerDay: number): number | null {
  const now = Date.now();
  const recent = (hits.get(bucketKey) ?? []).filter((t) => t > now - DAY_MS);

  const lastMinute = recent.filter((t) => t > now - MINUTE_MS).length;
  if (lastMinute >= maxPerMinute) return 60;
  if (recent.length >= maxPerDay) return 3600;

  recent.push(now);
  hits.set(bucketKey, recent);
  if (hits.size > 10_000) hits.clear(); // crude bound on memory
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const ip = extractIPAddress(req);
  const isTightLlmRoute = TIGHT_LLM_PREFIXES.some((p) => pathname.startsWith(p));
  const retryAfter = isTightLlmRoute
    ? tooMany(`llm:${ip}`, TIGHT_MAX_PER_MINUTE, TIGHT_MAX_PER_DAY)
    : tooMany(`api:${ip}`, MAX_PER_MINUTE, MAX_PER_DAY);

  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
