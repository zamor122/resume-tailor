import { NextRequest, NextResponse } from "next/server";
import type { ComfortLevel } from "@/app/config/aiToolRegistry";
import { analyzeResumeForFutureproof } from "@/app/services/futureproofAgent";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const resumeText = typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
    const comfortLevel: ComfortLevel =
      body?.comfortLevel === "automator" ? "automator" : "everyday";

    if (resumeText.length < 80) {
      return NextResponse.json(
        {
          error:
            "Please paste or upload your resume (at least 80 characters) so we can match industry-standard AI tools to your real work history.",
        },
        { status: 400 }
      );
    }

    const payload = await analyzeResumeForFutureproof({
      resumeText,
      comfortLevel,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[futureproof/analyze] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume for AI experience. Please try again." },
      { status: 500 }
    );
  }
}
