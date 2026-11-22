/**
 * One lifetime free anonymous preview per hashed IP (no daily resets).
 * Used by humanize/stream when userId is missing.
 *
 * CHECK and RECORD are deliberately SEPARATE so a failed or timed-out first run does
 * not burn the visitor's 1 preview — record only on success.
 */

import { NextRequest } from "next/server";
import { extractIPAddress, hashIPAddress } from "@/app/utils/apiRateLimiter";
import { supabaseAdmin } from "@/app/lib/supabase/server";

/** Read-only: has this IP already used its 1 lifetime anonymous preview? */
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

    // Lifetime cap: once recorded, an anonymous IP must sign in to continue.
    const allowed = !row?.last_used_at;

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
