import { NextRequest, NextResponse } from "next/server";
import { processDripSequence } from "@/app/services/dripSequenceService";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Validate authorization for Vercel Cron
  const authHeader = req.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (expectedAuth && authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
