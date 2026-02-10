import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, resumeId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId - authentication required" },
        { status: 401 }
      );
    }

    if (!sessionId && !resumeId) {
      return NextResponse.json(
        { error: "Missing sessionId or resumeId" },
        { status: 400 }
      );
    }

    // Find resumes to link
    let query = supabaseAdmin
      .from('resumes')
      .select('id')
      .is('user_id', null); // Only link resumes without user_id (IS NULL, not = NULL)

    if (resumeId) {
      query = query.eq('id', resumeId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: resumesToLink, error: findError } = await query;

    if (findError) {
      console.error("Error finding resumes to link:", findError);
      return NextResponse.json(
        { error: "Failed to find resumes", message: findError.message },
        { status: 500 }
      );
    }

    if (!resumesToLink || resumesToLink.length === 0) {
      return NextResponse.json(
        { message: "No resumes found to link", linked: 0 },
        { status: 200 }
      );
    }

    // Link all matching resumes to user_id
    const resumeIds = resumesToLink.map(r => r.id);
    const { data: updatedResumes, error: updateError } = await supabaseAdmin
      .from('resumes')
      .update({ user_id: userId })
      .in('id', resumeIds)
      .select('id');

    if (updateError) {
      console.error("Error linking resumes:", updateError);
      return NextResponse.json(
        { error: "Failed to link resumes", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      linked: updatedResumes?.length || 0,
      resumeIds: updatedResumes?.map(r => r.id) || [],
    });

  } catch (error) {
    console.error("Error in resume link API:", error);
    return NextResponse.json(
      {
        error: "Failed to link resumes",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}





