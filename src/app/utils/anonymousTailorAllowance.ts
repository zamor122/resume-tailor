/**
 * One free anonymous tailor per hashed IP per 24 hours.
 * Used by humanize/stream when userId is missing.
 */

import { NextRequest } from "next/server";
import { extractIPAddress, hashIPAddress } from "@/app/utils/apiRateLimiter";
import { supabaseAdmin } from "@/app/lib/supabase/server";

const WINDOW_HOURS = 24;

export async function checkAndRecordAnonymousTailor(
  req: NextRequest
): Promise<{ allowed: boolean }> {
  const ip = extractIPAddress(req);
  const hashedIP = await hashIPAddress(ip);
  if (hashedIP === "unknown") {
    return { allowed: false };
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

    if (allowed) {
      await supabaseAdmin
        .from("anonymous_tailors")
        .upsert(
          { hashed_ip: hashedIP, last_used_at: now.toISOString() },
          { onConflict: "hashed_ip" }
        );
    }

    return { allowed };
  } catch (e) {
    console.error("[anonymousTailorAllowance]", e);
    return { allowed: false };
  }
}
