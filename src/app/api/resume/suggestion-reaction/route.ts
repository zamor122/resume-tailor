import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";
import type { ResumeSuggestion } from "@/app/agent/state";

export const runtime = "edge";
export const preferredRegion = "auto";
export const maxDuration = 30;

const VALID_REACTIONS = new Set(["helpful", "not_helpful"]);
const VALID_STATUSES = new Set(["accepted", "rejected", "pending"]);

function applyReactionToSuggestions(
  list: unknown,
  suggestionId: string,
  reaction: "helpful" | "not_helpful",
  status?: "accepted" | "rejected" | "pending"
): ResumeSuggestion[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return (list as ResumeSuggestion[]).map((s) =>
    s && s.id === suggestionId
      ? {
          ...s,
          reaction,
          ...(status ? { status } : {}),
        }
      : s
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resumeId,
      suggestionId,
      reaction,
      addedKeywords,
      status,
      userId,
      accessToken,
      sessionId,
    } = body;

    if (!resumeId || !suggestionId || !VALID_REACTIONS.has(reaction)) {
      return NextResponse.json(
        { error: "resumeId, suggestionId, and reaction ('helpful' | 'not_helpful') are required" },
        { status: 400 }
      );
    }

    const nextStatus =
      typeof status === "string" && VALID_STATUSES.has(status)
        ? (status as "accepted" | "rejected" | "pending")
        : undefined;

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
      .select("id, user_id, session_id, improvement_metrics")
      .eq("id", resumeId)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const isOwnerByUser = authenticatedUserId && resume.user_id === authenticatedUserId;
    const isOwnerBySession = !authenticatedUserId && sessionId && resume.session_id === sessionId;
    if (!isOwnerByUser && !isOwnerBySession) {
      return NextResponse.json(
        { error: "You do not have permission to update reactions for this resume" },
        { status: 403 }
      );
    }

    const existingMetrics = (resume.improvement_metrics || {}) as Record<string, unknown>;
    const updatedMetricsSuggestions = applyReactionToSuggestions(
      existingMetrics.suggestions,
      suggestionId,
      reaction,
      nextStatus
    );

    const safeKeywords = Array.isArray(addedKeywords)
      ? addedKeywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .slice(0, 10)
      : [];

    const existingReactions =
      (existingMetrics.keywordReactions as Record<string, unknown> | undefined) || {};

    const nextMetrics: Record<string, unknown> = {
      ...existingMetrics,
      ...(updatedMetricsSuggestions && { suggestions: updatedMetricsSuggestions }),
      keywordReactions: {
        ...existingReactions,
        [suggestionId]: {
          reaction,
          addedKeywords: safeKeywords,
          updatedAt: new Date().toISOString(),
        },
      },
    };

    const updatePayload: Record<string, unknown> = {
      improvement_metrics: nextMetrics,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from("resumes")
      .update(updatePayload)
      .eq("id", resumeId);

    if (updateError) {
      console.error("Error saving suggestion reaction:", updateError);
      return NextResponse.json(
        { error: "Failed to save reaction", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestionId,
      reaction,
    });
  } catch (error) {
    console.error("Error in suggestion-reaction API:", error);
    return NextResponse.json(
      {
        error: "Failed to save reaction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
