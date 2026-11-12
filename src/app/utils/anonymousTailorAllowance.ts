/**
 * One free anonymous tailor per hashed IP per 24 hours.
 * Used by humanize/stream when userId is missing.
 *
 * CHECK and RECORD are deliberately SEPARATE. The original recorded the usage inside the
 * check, before the pipeline ran — so a visitor whose run then FAILED still lost their only
 * free preview. That is exactly what a 60s serverless timeout does: the function is killed
 * mid-stream with no chance to run cleanup, the visitor sees "connection interrupted", and
 * their retry is answered with "You've used your free preview. Create a free account."
 * A failed first impression must not consume the preview, so record only on success.
 */

import { NextRequest } from "next/server";
import { extractIPAddress, hashIPAddress } from "@/app/utils/apiRateLimiter";
import { supabaseAdmin } from "@/app/lib/supabase/server";

const WINDOW_HOURS = 24;

/** Read-only: is this IP still within its free-preview window? Does NOT consume it. */
export async function checkAnonymousTailorAllowed(
  req: NextRequest
): Promise<{ allowed: boolean; hashedIP: string }> {
  const ip = extractIPAddress(req);
  const hashedIP = await hashIPAddress(ip);
  if (hashedIP === "unknown") {
    return { allowed: false, hashedIP };
  }

  try {
    const { data: row } = await supabaseAdmin
      .from("anonymous_tailors")
      .select("last_used_at")
      .eq("hashed_ip", hashedIP)
      .single();

    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
    const lastUsed = row?.last_used_at ? new Date(row.last_used_at) : null;
    const allowed = !lastUsed || lastUsed < windowStart;

    return { allowed, hashedIP };
  } catch (e) {
    console.error("[anonymousTailorAllowance]", e);
    return { allowed: false, hashedIP };
  }
}

/** Consume the free preview for this IP. Call ONLY after a run actually delivered a result. */
export async function recordAnonymousTailorUsage(hashedIP: string): Promise<void> {
  if (!hashedIP || hashedIP === "unknown") return;
  try {
    await supabaseAdmin
      .from("anonymous_tailors")
      .upsert(
        { hashed_ip: hashedIP, last_used_at: new Date().toISOString() },
        { onConflict: "hashed_ip" }
      );
  } catch (e) {
    console.error("[anonymousTailorAllowance] failed to record usage", e);
  }
}
