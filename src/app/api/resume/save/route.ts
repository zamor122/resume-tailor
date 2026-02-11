import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { obfuscateResume } from "@/app/utils/resumeObfuscator";
import { cleanJobDescription } from "@/app/utils/jobDescriptionCleaner";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const {
      originalResume,
      tailoredResume,
      jobDescription,
      sessionId,
      userId,
      customerEmail,
      matchScore,
      improvementMetrics,
      validationResult,
    } = await req.json();

    if (!originalResume || !tailoredResume) {
      return NextResponse.json(
        { error: "Missing required fields: originalResume and tailoredResume" },
        { status: 400 }
      );
    }

    // Obfuscate the tailored resume
    const obfuscationResult = obfuscateResume(originalResume, tailoredResume);

    // Clean job description
    const cleanedJobDescription = jobDescription
      ? cleanJobDescription(jobDescription)
      : null;

    // Normalize match_score: accept number or { before, after }
    const matchScoreForDb =
      typeof matchScore === "number"
        ? { after: matchScore }
        : matchScore && typeof matchScore === "object"
          ? matchScore
          : {};

    // Prepare insert data
    const insertData: any = {
      original_content: originalResume,
      tailored_content: tailoredResume,
      obfuscated_content: obfuscationResult.obfuscatedResume,
      content_map: obfuscationResult.contentMap,
      job_description: cleanedJobDescription,
      match_score: matchScoreForDb,
      improvement_metrics: improvementMetrics || {},
      free_reveal: obfuscationResult.freeReveal,
    };

    // Add optional fields
    if (sessionId) {
      insertData.session_id = sessionId;
    }
    if (userId) {
      insertData.user_id = userId;
    }
    if (customerEmail) {
      insertData.customer_email = customerEmail;
    }

    // Check if resume already exists for this session (idempotent)
    let resumeId: string | null = null;
    if (sessionId) {
      const { data: existing } = await supabaseAdmin
        .from('resumes')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      if (existing) {
        // Update existing resume
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('resumes')
          .update(insertData)
          .eq('id', existing.id)
          .select('id')
          .single();

        if (updateError) {
          console.error('Error updating resume:', updateError);
          return NextResponse.json(
            { error: "Failed to update resume", message: updateError.message },
            { status: 500 }
          );
        }

        resumeId = updated?.id || null;
      }
    }

    // If no existing resume, create new one
    if (!resumeId) {
      const { data: resume, error: resumeError } = await supabaseAdmin
        .from('resumes')
        .insert(insertData)
        .select('id')
        .single();

      if (resumeError) {
        console.error('Error saving resume:', resumeError);
        return NextResponse.json(
          { error: "Failed to save resume", message: resumeError.message },
          { status: 500 }
        );
      }

      resumeId = resume?.id || null;
    }

    return NextResponse.json({
      success: true,
      resumeId,
    });

  } catch (error) {
    console.error("Error in resume save API:", error);
    return NextResponse.json(
      {
        error: "Failed to save resume",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}





