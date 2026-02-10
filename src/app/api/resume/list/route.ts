import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: "Missing userId or sessionId parameter" },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('resumes')
      .select(`
        id, 
        created_at, 
        job_description, 
        job_title,
        company_name,
        match_score, 
        improvement_metrics,
        payments!inner (
          id,
          status,
          amount_cents,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: resumesWithPayments, error: resumesError } = await query;
    
    // Also fetch resumes without payments
    let unpaidQuery = supabaseAdmin
      .from('resumes')
      .select('id, created_at, job_description, job_title, company_name, match_score, improvement_metrics')
      .order('created_at', { ascending: false });

    if (userId) {
      unpaidQuery = unpaidQuery.eq('user_id', userId);
    } else if (sessionId) {
      unpaidQuery = unpaidQuery.eq('session_id', sessionId);
    }

    const { data: allResumes, error } = await unpaidQuery;

    if (error) {
      console.error("Error fetching resumes:", error);
      return NextResponse.json(
        { error: "Failed to fetch resumes", message: error.message },
        { status: 500 }
      );
    }

    // Get payment status for each resume
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('resume_id, status, amount_cents, created_at')
      .eq('status', 'completed')
      .in('resume_id', (allResumes || []).map(r => r.id));

    // Create a payment lookup map
    const paymentMap = new Map();
    (payments || []).forEach(payment => {
      paymentMap.set(payment.resume_id, payment);
    });

    // Transform to include metadata and payment status
    const resumeList = (allResumes || []).map((resume) => {
      // Use stored job_title and company_name when available; fallback to parsed job_description
      const displayTitle = buildResumeDisplayTitle(
        resume.job_title,
        resume.company_name,
        resume.job_description,
        resume.created_at
      );

      const payment = paymentMap.get(resume.id);
      
      return {
        id: resume.id,
        createdAt: resume.created_at,
        jobTitle: displayTitle,
        matchScore: resume.match_score || { before: 0, after: 0 },
        improvementMetrics: resume.improvement_metrics || {},
        isPaid: !!payment,
        payment: payment ? {
          amount: payment.amount_cents / 100,
          paidAt: payment.created_at
        } : null,
      };
    });

    return NextResponse.json({ resumes: resumeList });

  } catch (error) {
    console.error("Error in resume list API:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve resume list",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * Build resume display title: use stored job_title and company_name when available,
 * otherwise fall back to extracting from job_description.
 */
function buildResumeDisplayTitle(
  storedJobTitle: string | null | undefined,
  storedCompanyName: string | null | undefined,
  jobDescription: string | null | undefined,
  createdAt: string | undefined
): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = createdAt ? new Date(createdAt) : new Date();
  const formattedDate = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

  // Prefer stored job_title and company_name (from company-research extraction)
  if (storedJobTitle || storedCompanyName) {
    const titlePart = storedJobTitle?.trim() || "Resume";
    const companyPart = storedCompanyName?.trim();
    if (companyPart) {
      return `${titlePart} at ${companyPart} - ${formattedDate}`;
    }
    return `${titlePart} - ${formattedDate}`;
  }

  // Fallback: extract from job_description for older resumes
  if (!jobDescription) return `Resume - ${formattedDate}`;
  return extractJobTitleFromDescription(jobDescription, formattedDate);
}

/**
 * Extract job title and company from job description (fallback for resumes without stored metadata)
 */
function extractJobTitleFromDescription(jobDescription: string, formattedDate: string): string {
  const lines = jobDescription.split('\n').slice(0, 10);
  let jobTitle = "";
  let company = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.length < 100 && !trimmed.includes('http') && !jobTitle) {
      const cleaned = trimmed
        .replace(/^(Job Title|Title|Position|Role):\s*/i, '')
        .replace(/^(#+\s*)/, '')
        .replace(/^\*\s*/, '')
        .trim();
      if (cleaned.length > 0 && cleaned.length < 80) jobTitle = cleaned;
    }

    if (!company) {
      const companyPatterns = [
        /(?:at|@)\s+([A-Z][a-zA-Z\s&,.]+?)(?:\s|$|,|\.)/i,
        /(?:company|employer):\s*([A-Z][a-zA-Z\s&,.]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s&,.]{2,30})\s+(?:is|seeks|hiring|looking)/i,
        /^([A-Z][a-zA-Z\s&,.]{2,30})\s*-/,
      ];
      for (const pattern of companyPatterns) {
        const match = trimmed.match(pattern);
        if (match?.[1]) {
          company = match[1].trim().replace(/[,.]$/, '');
          break;
        }
      }
    }
    if (jobTitle && company) break;
  }

  if (jobTitle && company) return `${jobTitle} at ${company} - ${formattedDate}`;
  if (jobTitle) return `${jobTitle} - ${formattedDate}`;
  return `Resume - ${formattedDate}`;
}

