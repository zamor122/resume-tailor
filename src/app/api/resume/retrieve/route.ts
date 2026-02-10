import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { getAccessInfoServer } from "@/app/utils/accessManager";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { email, sessionId, resumeId, userId } = await req.json();

    if (!resumeId && !email) {
      return NextResponse.json(
        { error: "Missing required fields: either resumeId or email must be provided" },
        { status: 400 }
      );
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

    // Verify access: user must have active time-based access
    let hasAccess = false;
    let accessInfo = null;

    // Check for active time-based access grant
    if (userId) {
      accessInfo = await getAccessInfoServer(userId);
      hasAccess = accessInfo?.hasAccess || false;
    }

    // If no access, return obfuscated content
    if (!hasAccess) {
      return NextResponse.json({
        success: true,
        originalResume: resume.original_content,
        tailoredResume: resume.obfuscated_content, // Return obfuscated version
        obfuscatedResume: resume.obfuscated_content,
        contentMap: resume.content_map,
        jobDescription: resume.job_description,
        matchScore: resume.match_score,
        metrics: resume.match_score?.beforeMetrics && resume.match_score?.afterMetrics
          ? { before: resume.match_score.beforeMetrics, after: resume.match_score.afterMetrics }
          : undefined,
        improvementMetrics: resume.improvement_metrics,
        freeReveal: resume.free_reveal,
        formatSpec: resume.format_spec ?? null,
        resumeId: resume.id,
        isUnlocked: false,
        accessInfo: null,
      });
    }

    // Return resume data with access info (unobfuscated since user has access)
    return NextResponse.json({
      success: true,
      originalResume: resume.original_content,
      tailoredResume: resume.tailored_content, // Return unobfuscated version
      obfuscatedResume: resume.obfuscated_content,
      contentMap: resume.content_map,
      jobDescription: resume.job_description,
      matchScore: resume.match_score,
      metrics: resume.match_score?.beforeMetrics && resume.match_score?.afterMetrics
        ? { before: resume.match_score.beforeMetrics, after: resume.match_score.afterMetrics }
        : undefined,
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

