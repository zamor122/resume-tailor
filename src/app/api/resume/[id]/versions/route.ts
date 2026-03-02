import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resumeId } = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined;

    if (!resumeId) {
      return NextResponse.json({ error: "Missing resume id" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const authResult = await requireAuth(req, { accessToken });
    if ("error" in authResult) return authResult.error;
    const verifyResult = verifyUserIdMatch(authResult.userId, userId);
    if ("error" in verifyResult) return verifyResult.error;

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, parent_resume_id, root_resume_id, version_number")
      .eq("id", resumeId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (row.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rootId = row.root_resume_id ?? row.id;

    const { data: versions, error: listError } = await supabaseAdmin
      .from("resumes")
      .select("id, version_number, match_score, created_at")
      .eq("user_id", userId)
      .or(`id.eq.${rootId},root_resume_id.eq.${rootId}`)
      .order("version_number", { ascending: true });

    if (listError) {
      return NextResponse.json(
        { error: "Failed to load versions", message: listError.message },
        { status: 500 }
      );
    }

    const ms = (v: (typeof versions)[0]) =>
      (v.match_score as { after?: number; before?: number })?.after ??
      (v.match_score as { after?: number; before?: number })?.before ??
      0;

    const list = (versions ?? []).map((v) => ({
      id: v.id,
      version_number: v.version_number ?? 1,
      matchScore: ms(v),
      created_at: v.created_at,
    }));

    return NextResponse.json({
      rootResumeId: rootId,
      versions: list,
    });
  } catch (error) {
    console.error("[Versions] Error:", error);
    return NextResponse.json(
      { error: "Failed to load versions", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
