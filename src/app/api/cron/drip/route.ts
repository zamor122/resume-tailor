import { NextRequest, NextResponse } from "next/server";
import { processDripSequence } from "@/app/services/dripSequenceService";
import { timingSafeEqualString } from "@/app/utils/timingSafe";

export const maxDuration = 60;

function requireCronAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  // Fail closed when CRON_SECRET is missing, and use constant-time comparison
  if (!expectedAuth || !timingSafeEqualString(authHeader, expectedAuth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  try {
    const summary = await processDripSequence();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("[Cron:drip] Execution error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process drip sequence" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const { dryRun, targetEmail } = body;

    const summary = await processDripSequence({ dryRun, targetEmail });
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("[API:drip] POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process drip sequence" },
      { status: 500 }
    );
  }
}
