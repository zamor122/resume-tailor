import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/app/services/ai-provider";
import {
  getRecommendedToolsForResume,
  isRoleRecentForAi,
  type ComfortLevel,
} from "@/app/config/aiToolRegistry";
import type { IndustryCategory } from "@/app/config/domainTaxonomy";
import { extractJSONFromText } from "@/app/utils/json-extractor";
import type {
  DetectedRole,
  FutureproofAnalyzeResponse,
  RecommendedToolView,
} from "@/app/utils/futureproofSanitizer";

export const runtime = "nodejs";
export const maxDuration = 45;

const PRIMARY_MODEL = "gemini:gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini:gemini-2.5-flash-lite"];

const VALID_INDUSTRIES = new Set<IndustryCategory>([
  "healthcare",
  "hospitality_service",
  "sales_marketing",
  "finance_accounting",
  "operations_logistics",
  "trades_facilities",
  "aviation_aerospace",
  "education_coaching",
  "technology_engineering",
  "legal_compliance",
  "general_business",
]);

interface LlmAnalyzePayload {
  industry?: string;
  subRoleLabel?: string;
  roles?: Array<{
    title?: string;
    company?: string;
    dateRange?: string;
  }>;
  fitReasons?: Record<string, string>;
}

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

    const boundedResume = resumeText.slice(0, 24000);

    // Deterministic baseline so even if the LLM call is slow or returns partial JSON,
    // we ALWAYS return accurate, verified industry-standard tools.
    const baseline = getRecommendedToolsForResume({
      resumeText: boundedResume,
      comfortLevel,
      limit: 6,
    });

    const toolListForPrompt = baseline.tools
      .map(
        (t) =>
          `- id: "${t.id}" | name: "${t.name}" | useCases: ${t.workflowUseCases.join("; ")}`
      )
      .join("\n");

    const prompt = `You are a career strategist helping a professional add REAL, coherent, industry-standard AI experience to their resume.
Analyze the resume below and return ONLY valid JSON (no markdown commentary).

RESUME:
"""
${boundedResume.slice(0, 12000)}
"""

CANDIDATE CURATED AI TOOLS FOR THIS DOMAIN:
${toolListForPrompt}

Return strictly valid JSON with this exact shape:
{
  "industry": one of ["healthcare","hospitality_service","sales_marketing","finance_accounting","operations_logistics","trades_facilities","aviation_aerospace","education_coaching","technology_engineering","legal_compliance","general_business"],
  "subRoleLabel": "Concise 2-5 word profession label, e.g. 'Internal Medicine Physician' or 'Executive Administrative Assistant'",
  "roles": [
    { "title": "Job Title", "company": "Employer", "dateRange": "e.g. 2022 - Present" }
  ],
  "fitReasons": {
    "<tool_id>": "Plain-English 8-12 word line explaining what this does in THIS person's daily job (zero tech jargon)."
  }
}

Rules:
- Extract up to 5 most recent work experience roles from the resume.
- Write fitReasons for a busy non-technical human (e.g. 'Drafts HIPAA-safe Epic notes during your 20+ daily visits' or 'Summarizes weekly exec meetings and tracks follow-ups').
- Keep every fitReason under 90 characters.`;

    let llmParsed: LlmAnalyzePayload | null = null;
    try {
      const llmRes = await generateContentWithFallback(
        prompt,
        PRIMARY_MODEL,
        { temperature: 0.2, maxTokens: 1200 },
        undefined,
        FALLBACK_MODELS
      );
      const rawJson = extractJSONFromText(llmRes.text);
      if (rawJson) {
        llmParsed = JSON.parse(rawJson) as LlmAnalyzePayload;
      }
    } catch (llmErr) {
      console.warn("[futureproof/analyze] LLM enrichment failed, using deterministic baseline:", llmErr);
    }

    // Re-score tools if LLM identified a more specific valid industry
    const detectedIndustry: IndustryCategory =
      llmParsed?.industry && VALID_INDUSTRIES.has(llmParsed.industry as IndustryCategory)
        ? (llmParsed.industry as IndustryCategory)
        : baseline.industry;

    const finalRecommendation =
      detectedIndustry === baseline.industry
        ? baseline
        : getRecommendedToolsForResume({
            resumeText: boundedResume,
            industry: detectedIndustry,
            comfortLevel,
            limit: 6,
          });

    const detectedRoles: DetectedRole[] = (llmParsed?.roles || [])
      .filter((r) => r && (r.title || r.company))
      .slice(0, 5)
      .map((r, idx) => {
        const dateRange = (r.dateRange || "").trim();
        return {
          id: `role-${idx}`,
          title: (r.title || "Role").trim(),
          company: (r.company || "").trim(),
          dateRange,
          isRecentForAi: isRoleRecentForAi(dateRange),
        };
      });

    const hasRecentRoles =
      detectedRoles.length === 0 || detectedRoles.some((r) => r.isRecentForAi);

    const recommendedTools: RecommendedToolView[] = finalRecommendation.tools.map(
      (tool) => ({
        id: tool.id,
        name: tool.name,
        vendor: tool.vendor,
        complianceBadges: tool.complianceBadges,
        isIndustryStandard: tool.isIndustryStandard,
        comfortTier: tool.comfortTier,
        preselected: tool.preselected,
        shortDescription: tool.shortDescription,
        fitReason:
          llmParsed?.fitReasons?.[tool.id]?.trim() ||
          `Aligns with your ${finalRecommendation.industryDisplayName.toLowerCase()} workflow: ${tool.workflowUseCases[0]}.`,
      })
    );

    const payload: FutureproofAnalyzeResponse = {
      industry: finalRecommendation.industry,
      industryDisplayName: finalRecommendation.industryDisplayName,
      subRoleLabel:
        llmParsed?.subRoleLabel?.trim() || finalRecommendation.industryDisplayName,
      detectedRoles,
      hasRecentRoles,
      recommendedTools,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[futureproof/analyze] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume for AI experience. Please try again." },
      { status: 500 }
    );
  }
}
