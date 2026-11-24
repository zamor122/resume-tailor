import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/app/services/ai-provider";
import {
  resolveVerifiedTools,
  type ComfortLevel,
} from "@/app/config/aiToolRegistry";
import type { IndustryCategory } from "@/app/config/domainTaxonomy";
import { extractJSONFromText } from "@/app/utils/json-extractor";
import { extractAuthToken, getAuthenticatedUser } from "@/app/utils/auth";
import { getAccessInfoServer } from "@/app/utils/accessManager";
import {
  buildTalkingPointsFromRegistry,
  sanitizeFutureproofForLocked,
  type BulletUpgrade,
  type FutureproofGenerateResponse,
} from "@/app/utils/futureproofSanitizer";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRIMARY_MODEL = "gemini:gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini:gemini-2.5-flash-lite"];

interface LlmGeneratePayload {
  placementMode?: "inline_roles" | "modern_workflows_section";
  bulletUpgrades?: Array<{
    roleTitle?: string;
    company?: string;
    dateRange?: string;
    placementType?: "role_experience" | "modern_workflows_section";
    toolId?: string;
    toolName?: string;
    originalBullet?: string;
    upgradedBullet?: string;
    rationale?: string;
  }>;
  skillsBlock?: string[];
  mergedResume?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const resumeText = typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
    const comfortLevel: ComfortLevel =
      body?.comfortLevel === "automator" ? "automator" : "everyday";
    const useIndustryStandards = Boolean(body?.useIndustryStandards);
    const selectedToolIds = Array.isArray(body?.selectedToolIds)
      ? body.selectedToolIds.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const industryHint =
      typeof body?.industry === "string" ? (body.industry as IndustryCategory) : undefined;
    const accessToken =
      typeof body?.accessToken === "string" ? body.accessToken : undefined;

    if (resumeText.length < 80) {
      return NextResponse.json(
        { error: "Resume text is required (minimum 80 characters)." },
        { status: 400 }
      );
    }

    const boundedResume = resumeText.slice(0, 24000);

    // Strictly resolve selected tools against our verified registry (never trust arbitrary client tool names)
    const resolved = resolveVerifiedTools({
      resumeText: boundedResume,
      industry: industryHint,
      selectedToolIds,
      useIndustryStandards,
      comfortLevel,
    });

    // Server-side access check (never trust client-supplied unlock flags)
    let isUnlocked = false;
    const token = extractAuthToken(req, { accessToken });
    if (token) {
      const user = await getAuthenticatedUser(token);
      if (user?.id) {
        const accessInfo = await getAccessInfoServer(user.id);
        isUnlocked = Boolean(accessInfo?.hasAccess && !accessInfo.isExpired);
      }
    }

    const toolSpecs = resolved.tools
      .map(
        (t) =>
          `- id: "${t.id}" | name: "${t.name}" | vendor: "${t.vendor}" | compliance: [${t.complianceBadges.join(", ")}] | introduced: ${t.introducedYear}
  useCases: ${t.workflowUseCases.join("; ")}
  exampleStyle: "${t.examplePhrasing}"`
      )
      .join("\n");

    const toneDirective =
      comfortLevel === "automator"
        ? "Highlight workflow automation, SOP standardization, cross-tool orchestration, and team-level efficiency gains."
        : "Highlight natural, everyday AI adoption inside existing responsibilities—practical, modest, and immediately believable in interviews.";

    const prompt = `You are an elite executive resume writer specializing in integrating authentic, industry-standard AI usage into non-AI resumes.
Your job is to weave ONLY the verified AI tools below into this candidate's resume so it reads naturally, coherently, and credibly to hiring managers in ${resolved.industryDisplayName}.

VERIFIED AI TOOLS TO INTEGRATE (use ONLY these tools — do NOT invent other tools):
${toolSpecs}

TONE & DEPTH:
${toneDirective}

STRICT AUTHENTICITY & COHERENCE RULES:
1. Anchor EVERY upgraded bullet to a real responsibility already present in the candidate's resume. Preserve their real job titles, employers, dates, and authentic metrics. Never fabricate fake revenue numbers or fake titles.
2. TIMELINE GUARD: Only weave 2023+ AI tools into roles active in 2023–Present. If ALL roles on the resume ended before 2023, set "placementMode": "modern_workflows_section" and place the bullets into a clean "Modern Workflows & AI Proficiency" section instead of fabricating historical AI usage.
3. Produce 4 to 6 high-impact bullet upgrades spread naturally across eligible roles (or the Modern Workflows section), using each selected tool at least once.
4. Keep every bullet crisp (1–2 lines, strong domain-appropriate action verb, zero AI clichés like "leveraged cutting-edge AI synergy" or "spearheaded revolutionary AI transformation").
5. Produce a "skillsBlock" array of 4–7 clean, ATS-ready skill phrases naming the selected tools and workflows.
6. Produce "mergedResume": the candidate's full resume with the upgraded bullets and AI skills cleanly integrated in place, keeping their original structure intact.

CANDIDATE RESUME:
"""
${boundedResume.slice(0, 14000)}
"""

Return ONLY valid JSON with this exact shape:
{
  "placementMode": "inline_roles" | "modern_workflows_section",
  "bulletUpgrades": [
    {
      "roleTitle": "Exact Role Title from resume (or 'Modern Workflows & AI Proficiency')",
      "company": "Exact Employer from resume (or 'Professional Development')",
      "dateRange": "Exact Date Range from resume (or '2024 - Present')",
      "placementType": "role_experience" | "modern_workflows_section",
      "toolId": "exact id from VERIFIED AI TOOLS",
      "toolName": "exact name from VERIFIED AI TOOLS",
      "originalBullet": "Original bullet or responsibility from resume (or 'New AI workflow bullet')",
      "upgradedBullet": "Rewritten coherent bullet integrating the real AI tool naturally",
      "rationale": "1 short sentence explaining why this fits their role and industry standard"
    }
  ],
  "skillsBlock": ["Nuance DAX Copilot (HIPAA Ambient Documentation)", "..."],
  "mergedResume": "Full updated resume plain text with newlines escaped as \\n"
}`;

    const llmRes = await generateContentWithFallback(
      prompt,
      PRIMARY_MODEL,
      { temperature: 0.25, maxTokens: 3200 },
      undefined,
      FALLBACK_MODELS
    );

    const rawJson = extractJSONFromText(llmRes.text);
    if (!rawJson) {
      throw new Error("Model did not return valid JSON for Futureproof generation.");
    }

    const parsed = JSON.parse(rawJson) as LlmGeneratePayload;
    const validToolById = new Map(resolved.tools.map((t) => [t.id, t]));
    const defaultTool = resolved.tools[0];

    const bulletUpgrades: BulletUpgrade[] = (parsed.bulletUpgrades || [])
      .filter((b) => b && typeof b.upgradedBullet === "string" && b.upgradedBullet.trim().length > 10)
      .slice(0, 8)
      .map((b, idx) => {
        const matchedTool = (b.toolId && validToolById.get(b.toolId)) || defaultTool;
        return {
          id: `upgrade-${idx}`,
          roleTitle: (b.roleTitle || "Current Role").trim(),
          company: (b.company || "").trim(),
          dateRange: (b.dateRange || "").trim(),
          placementType:
            b.placementType === "modern_workflows_section"
              ? "modern_workflows_section"
              : "role_experience",
          toolId: matchedTool.id,
          toolName: matchedTool.name,
          originalBullet: (b.originalBullet || "Existing role responsibility").trim(),
          upgradedBullet: b.upgradedBullet!.trim(),
          rationale: (
            b.rationale ||
            `Demonstrates practical, industry-standard ${matchedTool.name} adoption.`
          ).trim(),
        };
      });

    if (bulletUpgrades.length === 0) {
      throw new Error("No coherent bullet upgrades were generated. Please try again.");
    }

    const skillsBlock = Array.isArray(parsed.skillsBlock)
      ? parsed.skillsBlock
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(0, 10)
      : resolved.tools.map((t) => t.name);

    const talkingPoints = buildTalkingPointsFromRegistry(resolved.tools);

    const fullResponse: FutureproofGenerateResponse = {
      industry: resolved.industry,
      industryDisplayName: resolved.industryDisplayName,
      selectedTools: resolved.tools.map((t) => ({
        id: t.id,
        name: t.name,
        vendor: t.vendor,
        complianceBadges: t.complianceBadges,
      })),
      placementMode:
        parsed.placementMode === "modern_workflows_section"
          ? "modern_workflows_section"
          : "inline_roles",
      bulletUpgrades,
      skillsBlock,
      interviewTalkingPoints: talkingPoints,
      mergedResume:
        typeof parsed.mergedResume === "string" && parsed.mergedResume.trim().length > 50
          ? parsed.mergedResume.trim()
          : null,
      isUnlocked,
      totalUpgrades: bulletUpgrades.length,
      unlockedCount: bulletUpgrades.length,
    };

    const safeResponse = isUnlocked
      ? fullResponse
      : sanitizeFutureproofForLocked(fullResponse);

    return NextResponse.json(safeResponse);
  } catch (error) {
    console.error("[futureproof/generate] Error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to generate AI experience upgrades. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
