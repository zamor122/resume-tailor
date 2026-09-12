import { NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getExperienceBulletsPrompt } from "@/app/prompts/tailoringSection";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";

export const runtime = "nodejs";

export interface TailorChunkPayload {
  sectionGroup: ResumeSectionGroup;
  resumeContext?: string;
  jobDescription?: string;
  jobTitle?: string;
  sortedMissingKeywords?: string[];
  preferences?: TailoringPreferences;
  modelKey?: string;
  sessionApiKeys?: Record<string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TailorChunkPayload;
    const {
      sectionGroup,
      resumeContext = "",
      jobDescription = "",
      sortedMissingKeywords = [],
      preferences,
      modelKey,
      sessionApiKeys,
    } = body;

    if (!sectionGroup || !sectionGroup.originalContent) {
      return NextResponse.json(
        { error: "Invalid sectionGroup payload: sectionGroup and originalContent are required" },
        { status: 400 }
      );
    }

    // If section has no changes or is already unchanged, return as ready
    if (!sectionGroup.hasChanges && (!sectionGroup.suggestions || sectionGroup.suggestions.length === 0)) {
      return NextResponse.json({
        sectionGroup: {
          ...sectionGroup,
          status: "ready",
        },
      });
    }

    const titleParts = (sectionGroup.title || "").split(/\s*[–—-]\s*/);
    const company = titleParts[0]?.trim() || sectionGroup.title || "";
    const jobTitle = body.jobTitle || titleParts.slice(1).join(" – ").trim() || "";

    const prompt = getExperienceBulletsPrompt({
      jobTitle,
      company,
      dates: sectionGroup.subtitle || "",
      bulletsText: sectionGroup.originalContent,
      jobDescription: (jobDescription || "").slice(0, 3000),
      resumeContext: resumeContext || "",
      preferences,
      userRequestedKeywords: (sortedMissingKeywords || []).slice(0, 10),
    });

    const llmRes = await generateWithFallback(
      prompt,
      modelKey,
      { maxTokens: 600, temperature: 0.2 },
      sessionApiKeys
    );

    let rawNewBullets = llmRes.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^([-*•–—]|\d+\.)\s+/.test(l) || /^[-*•–—]/.test(l));

    if (rawNewBullets.length === 0) {
      rawNewBullets = llmRes.text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => (l.startsWith("- ") ? l : `- ${l}`));
    }

    const origBullets = sectionGroup.originalContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const suggestions: ResumeSuggestion[] = [];
    rawNewBullets.forEach((newB, idx) => {
      const cleanNew = newB.replace(/^([-*•–—]|\d+\.)\s*/, "");
      const cleanOrig = (origBullets[idx] || origBullets[0] || "").replace(/^([-*•–—]|\d+\.)\s*/, "");
      if (cleanOrig && cleanNew && cleanOrig.trim() !== cleanNew.trim()) {
        const matchedKw = (sortedMissingKeywords || []).filter((kw) =>
          cleanNew.toLowerCase().includes(kw.toLowerCase())
        ).slice(0, 3);
        const hasMetric = /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanNew) && !/\d+%|\$\d+|\d+x|\d+\+/i.test(cleanOrig);

        suggestions.push({
          id: `${sectionGroup.id}-sug-${idx}`,
          section: sectionGroup.title,
          originalText: cleanOrig.trim(),
          suggestedText: cleanNew.trim(),
          reason: hasMetric
            ? "Quantified operational impact metric for recruiter resonance"
            : "Targeted ATS keyword alignment and active leadership voice",
          keywords: matchedKw,
          category: hasMetric ? "metric" : matchedKw.length > 0 ? "keyword" : "action_verb",
          status: "accepted",
          jobIndex: sectionGroup.jobIndex,
          bulletIndex: idx,
        });
      }
    });

    const updatedGroup: ResumeSectionGroup = {
      ...sectionGroup,
      status: "ready",
      suggestions,
      tailoredContent: rawNewBullets.join("\n"),
    };

    return NextResponse.json({ sectionGroup: updatedGroup });
  } catch (error: any) {
    console.error("[tailor-chunk] Failed to tailor chunk:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to tailor chunk" },
      { status: 500 }
    );
  }
}
