import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";

export const runtime = "edge";
export const preferredRegion = "auto";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeId, applied, comment, userId, accessToken, sessionId } = body;

    if (!resumeId || typeof applied !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid required fields: resumeId and applied (boolean) are required" },
        { status: 400 }
      );
    }

    // Caller must identify via userId+accessToken (authenticated) or sessionId (anonymous)
    let authenticatedUserId: string | null = null;
    if (userId && accessToken) {
      const authResult = await requireAuth(req, { accessToken });
      if ("error" in authResult) return authResult.error;
      const verifyResult = verifyUserIdMatch(authResult.userId, userId);
      if ("error" in verifyResult) return verifyResult.error;
      authenticatedUserId = authResult.userId;
    } else if (!sessionId) {
      return NextResponse.json(
        { error: "Missing auth: provide userId and accessToken, or sessionId" },
        { status: 400 }
      );
    }

    const { data: resume, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, session_id")
      .eq("id", resumeId)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    // Allow update only if caller owns the resume
    const isOwnerByUser = authenticatedUserId && resume.user_id === authenticatedUserId;
    const isOwnerBySession = !authenticatedUserId && sessionId && resume.session_id === sessionId;
    if (!isOwnerByUser && !isOwnerBySession) {
      return NextResponse.json(
        { error: "You do not have permission to update feedback for this resume" },
        { status: 403 }
      );
    }

    const feedbackComment =
      typeof comment === "string" ? comment.trim().slice(0, 500) || null : null;

    const { error: updateError } = await supabaseAdmin
      .from("resumes")
      .update({
        applied_with_resume: applied,
        feedback_comment: feedbackComment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resumeId);

    if (updateError) {
      console.error("Error updating resume feedback:", updateError);
      return NextResponse.json(
        { error: "Failed to save feedback", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appliedWithResume: applied,
      feedbackComment,
    });
  } catch (error) {
    console.error("Error in resume feedback API:", error);
    return NextResponse.json(
      {
        error: "Failed to save feedback",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
