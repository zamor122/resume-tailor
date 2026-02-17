import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { getAccessInfoServer, isWithinFreeResumeLimitServer } from "@/app/utils/accessManager";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, sessionId, resumeId, userId, accessToken } = body;

    if (!resumeId && !email) {
      return NextResponse.json(
        { error: "Missing required fields: either resumeId or email must be provided" },
        { status: 400 }
      );
    }

    // When userId is provided for access check, verify the caller is authenticated and matches
    if (userId) {
      const authResult = await requireAuth(req, { accessToken });
      if ("error" in authResult) return authResult.error;
      const verifyResult = verifyUserIdMatch(authResult.userId, userId);
      if ("error" in verifyResult) return verifyResult.error;
    }

    let resume: any = null;

    // Try to find resume by resumeId first (most specific)
    if (resumeId) {
      const { data: resumeById, error: resumeError } = await supabaseAdmin
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();

      if (!resumeError && resumeById) {
        resume = resumeById;
      }
    }

    // If not found by ID, try by email + sessionId
    if (!resume && email && sessionId) {
      const { data: resumeByEmail, error: emailError } = await supabaseAdmin
        .from('resumes')
        .select('*')
        .eq('customer_email', email)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!emailError && resumeByEmail) {
        resume = resumeByEmail;
      }
    }

    // If still not found, try by email alone (get most recent)
    if (!resume && email) {
      const { data: resumeByEmailOnly, error: emailOnlyError } = await supabaseAdmin
        .from('resumes')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!emailOnlyError && resumeByEmailOnly) {
        resume = resumeByEmailOnly;
      }
    }

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    // Verify access: paid access OR within first 3 free resumes (by created_at)
    let hasAccess = false;
    let accessInfo = null;

    if (userId) {
      accessInfo = await getAccessInfoServer(userId);
      const paidAccess = accessInfo?.hasAccess || false;
      const freeAccess = await isWithinFreeResumeLimitServer(resume.id, userId);
      hasAccess = paidAccess || freeAccess;
    }

    // If no access, return obfuscated content
    if (!hasAccess) {
      const ms = resume.match_score as { before?: number; after?: number; afterMetrics?: unknown } | null;
      return NextResponse.json({
        success: true,
        originalResume: resume.original_content,
        tailoredResume: resume.obfuscated_content, // Return obfuscated version
        obfuscatedResume: resume.obfuscated_content,
        contentMap: resume.content_map,
        jobDescription: resume.job_description,
        jobTitle: resume.job_title ?? null,
        matchScore: ms?.after ?? ms?.before ?? 0,
        metrics: ms?.afterMetrics ?? undefined,
        improvementMetrics: resume.improvement_metrics,
        freeReveal: resume.free_reveal,
        formatSpec: resume.format_spec ?? null,
        resumeId: resume.id,
        isUnlocked: false,
        accessInfo: null,
        appliedWithResume: resume.applied_with_resume ?? null,
        feedbackComment: resume.feedback_comment ?? null,
      });
    }

    // Return resume data with access info (unobfuscated since user has access)
    const ms = resume.match_score as { before?: number; after?: number; afterMetrics?: unknown } | null;
    return NextResponse.json({
      success: true,
      originalResume: resume.original_content,
      tailoredResume: resume.tailored_content, // Return unobfuscated version
      obfuscatedResume: resume.obfuscated_content,
      contentMap: resume.content_map,
      jobDescription: resume.job_description,
      jobTitle: resume.job_title ?? null,
      matchScore: ms?.after ?? ms?.before ?? 0,
      metrics: ms?.afterMetrics ?? undefined,
      improvementMetrics: resume.improvement_metrics,
      freeReveal: resume.free_reveal,
      formatSpec: resume.format_spec ?? null,
      resumeId: resume.id,
      isUnlocked: true,
      accessInfo: accessInfo ? {
        tier: accessInfo.tier,
        tierLabel: accessInfo.tierLabel,
        expiresAt: accessInfo.expiresAt?.toISOString() || null,
        remainingTime: accessInfo.remainingTime,
        isExpired: accessInfo.isExpired,
      } : null,
      appliedWithResume: resume.applied_with_resume ?? null,
      feedbackComment: resume.feedback_comment ?? null,
    });

  } catch (error) {
    console.error("Error in resume retrieve API:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve resume",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

