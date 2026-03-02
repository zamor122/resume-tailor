import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { getFreeResumeIdsServer } from "@/app/utils/accessManager";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";

export const runtime = 'nodejs';
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

    // When userId is provided, verify the caller is authenticated and matches
    if (userId) {
      const authResult = await requireAuth(req);
      if ("error" in authResult) return authResult.error;
      const verifyResult = verifyUserIdMatch(authResult.userId, userId);
      if ("error" in verifyResult) return verifyResult.error;
    }

    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const start = (page - 1) * limit;

    let resumeQuery = supabaseAdmin
      .from('resumes')
      .select('id, created_at, job_description, job_title, company_name, match_score, improvement_metrics, root_resume_id, version_number')
      .order('created_at', { ascending: false });

    if (userId) {
      resumeQuery = resumeQuery.eq('user_id', userId);
    } else if (sessionId) {
      resumeQuery = resumeQuery.eq('session_id', sessionId);
    }

    const { data: allRows, error } = await resumeQuery.limit(2000);

    if (error) {
      console.error("Error fetching resumes:", error);
      return NextResponse.json(
        { error: "Failed to fetch resumes", message: error.message },
        { status: 500 }
      );
    }

    const rows = allRows || [];
    const byRoot = new Map<string, typeof rows>();
    for (const r of rows) {
      const rootKey = r.root_resume_id ?? r.id;
      if (!byRoot.has(rootKey)) byRoot.set(rootKey, []);
      byRoot.get(rootKey)!.push(r);
    }

    const applications = Array.from(byRoot.entries()).map(([rootKey, group]) => {
      const latest = group.reduce((a, b) => ((a.version_number ?? 1) >= (b.version_number ?? 1) ? a : b));
      const score = (m: unknown) => (m as { after?: number; before?: number })?.after ?? (m as { after?: number; before?: number })?.before ?? 0;
      const bestMatchScore = Math.max(...group.map((g) => score(g.match_score)));
      return {
        id: latest.id,
        created_at: latest.created_at,
        job_description: latest.job_description,
        job_title: latest.job_title,
        company_name: latest.company_name,
        match_score: latest.match_score,
        improvement_metrics: latest.improvement_metrics,
        versionCount: group.length,
        bestMatchScore,
      };
    });

    applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const totalCount = applications.length;
    const pageApplications = applications.slice(start, start + limit);
    const resumeIds = pageApplications.map((r) => r.id);

    // Get payment status only for resumes on current page (smaller IN clause)
    let payments: { resume_id: string; status: string; amount_cents: number; created_at: string }[] = [];
    if (resumeIds.length > 0) {
      const { data: paymentsData } = await supabaseAdmin
        .from('payments')
        .select('resume_id, status, amount_cents, created_at')
        .eq('status', 'completed')
        .in('resume_id', resumeIds);
      payments = paymentsData || [];
    }

    // Create a payment lookup map
    const paymentMap = new Map();
    payments.forEach(payment => {
      paymentMap.set(payment.resume_id, payment);
    });

    // Get first 3 free resume IDs for user (when userId provided)
    const freeResumeIds = userId ? await getFreeResumeIdsServer(userId) : [];

    const resumeList = pageApplications.map((resume) => {
      const displayTitle = buildResumeDisplayTitle(
        resume.job_title,
        resume.company_name,
        resume.job_description
      );
      const payment = paymentMap.get(resume.id);
      const isUnlocked = freeResumeIds.includes(resume.id) || !!payment;
      return {
        id: resume.id,
        createdAt: resume.created_at,
        jobTitle: displayTitle,
        matchScore: (resume.match_score as { after?: number; before?: number })?.after ?? (resume.match_score as { after?: number; before?: number })?.before ?? 0,
        improvementMetrics: resume.improvement_metrics || {},
        isPaid: !!payment,
        isUnlocked,
        payment: payment ? {
          amount: payment.amount_cents / 100,
          paidAt: payment.created_at
        } : null,
        versionCount: resume.versionCount,
        bestMatchScore: resume.bestMatchScore,
      };
    });

    return NextResponse.json({
      resumes: resumeList,
      totalCount,
      page,
      limit,
    });

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
 * otherwise fall back to extracting from job_description. No date (created date shown separately in UI).
 */
function buildResumeDisplayTitle(
  storedJobTitle: string | null | undefined,
  storedCompanyName: string | null | undefined,
  jobDescription: string | null | undefined
): string {
  // Prefer stored job_title and company_name (from company-research extraction)
  if (storedJobTitle || storedCompanyName) {
    const titlePart = storedJobTitle?.trim() || "Resume";
    const companyPart = storedCompanyName?.trim();
    if (companyPart) {
      return `${titlePart} at ${companyPart}`;
    }
    return titlePart;
  }

  // Fallback: extract from job_description for older resumes
  if (!jobDescription) return "Resume";
  return extractJobTitleFromDescription(jobDescription);
}

/**
 * Extract job title and company from job description (fallback for resumes without stored metadata)
 */
function extractJobTitleFromDescription(jobDescription: string): string {
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

  if (jobTitle && company) return `${jobTitle} at ${company}`;
  if (jobTitle) return jobTitle;
  return "Resume";
}

