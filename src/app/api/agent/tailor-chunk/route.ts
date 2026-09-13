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

export interface RawChunkBulletItem {
  index?: number;
  originalText?: string;
  suggestedText?: string;
  status?: string;
  reason?: string;
  keywords?: string[];
}

/**
 * Resilient 1-to-1 bullet response parser.
 * Extracts structured JSON array if present, or gracefully falls back to line-by-line pairing.
 * Guarantees that every original bullet has a corresponding 1:1 suggestion/tailored output.
 */
export function parseChunkBulletsResponse(params: {
  llmText: string;
  origBullets: string[];
  sectionGroupId: string;
  sectionGroupTitle: string;
  jobIndex?: number;
  sortedMissingKeywords?: string[];
}): { suggestions: ResumeSuggestion[]; tailoredBullets: string[] } {
  const {
    llmText,
    origBullets,
    sectionGroupId,
    sectionGroupTitle,
    jobIndex,
    sortedMissingKeywords = [],
  } = params;

  let parsedItems: RawChunkBulletItem[] | null = null;

  // 1. Try to extract and parse JSON array
  try {
    let cleanText = llmText.trim();
    // Strip markdown code fences if present (```json ... ``` or ``` ...)
    const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleanText = fenceMatch[1].trim();
    } else {
      const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        cleanText = arrayMatch[0].trim();
      }
    }

    const candidate = JSON.parse(cleanText);
    if (Array.isArray(candidate) && candidate.length > 0) {
      parsedItems = candidate;
    }
  } catch {
    // JSON parse failed, will use fallback
  }

  const suggestions: ResumeSuggestion[] = [];
  const tailoredBullets: string[] = [];

  if (parsedItems && parsedItems.length > 0) {
    origBullets.forEach((origLine, idx) => {
      const cleanOrig = origLine.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();
      // Match by index or position
      const match =
        parsedItems!.find((p) => p.index === idx) ||
        parsedItems![idx];

      const cleanNew = (match?.suggestedText || (match as any)?.tailored || cleanOrig)
        .replace(/^([-*•–—]|\d+\.)\s*/, "")
        .trim();

      tailoredBullets.push(`- ${cleanNew}`);

      if (cleanOrig !== cleanNew) {
        const matchedKw = match?.keywords && match.keywords.length > 0
          ? match.keywords
          : sortedMissingKeywords.filter((kw) =>
              cleanNew.toLowerCase().includes(kw.toLowerCase())
            ).slice(0, 3);

        const hasMetric =
          /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanNew) &&
          !/\d+%|\$\d+|\d+x|\d+\+/i.test(cleanOrig);

        suggestions.push({
          id: `${sectionGroupId}-sug-${idx}`,
          section: sectionGroupTitle,
          originalText: cleanOrig,
          suggestedText: cleanNew,
          reason:
            match?.reason ||
            (hasMetric
              ? "Quantified operational impact metric for recruiter resonance"
              : "Targeted ATS keyword alignment and active leadership voice"),
          keywords: matchedKw,
          category: hasMetric ? "metric" : matchedKw.length > 0 ? "keyword" : "action_verb",
          status: "accepted",
          jobIndex,
          bulletIndex: idx,
        });
      }
    });

    return { suggestions, tailoredBullets };
  }

  // 2. Fallback: Parse raw bullet lines
  let rawNewBullets = llmText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^([-*•–—]|\d+\.)\s+/.test(l) || /^[-*•–—]/.test(l));

  if (rawNewBullets.length === 0) {
    rawNewBullets = llmText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => (l.startsWith("- ") ? l : `- ${l}`));
  }

  origBullets.forEach((origLine, idx) => {
    const cleanOrig = origLine.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();
    const rawNew = rawNewBullets[idx] || origLine;
    const cleanNew = rawNew.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();

    tailoredBullets.push(`- ${cleanNew}`);

    if (cleanOrig !== cleanNew) {
      const matchedKw = sortedMissingKeywords.filter((kw) =>
        cleanNew.toLowerCase().includes(kw.toLowerCase())
      ).slice(0, 3);

      const hasMetric =
        /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanNew) &&
        !/\d+%|\$\d+|\d+x|\d+\+/i.test(cleanOrig);

      suggestions.push({
        id: `${sectionGroupId}-sug-${idx}`,
        section: sectionGroupTitle,
        originalText: cleanOrig,
        suggestedText: cleanNew,
        reason: hasMetric
          ? "Quantified operational impact metric for recruiter resonance"
          : "Targeted ATS keyword alignment and active leadership voice",
        keywords: matchedKw,
        category: hasMetric ? "metric" : matchedKw.length > 0 ? "keyword" : "action_verb",
        status: "accepted",
        jobIndex,
        bulletIndex: idx,
      });
    }
  });

  return { suggestions, tailoredBullets };
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
      preferences,
      userRequestedKeywords: (sortedMissingKeywords || []).slice(0, 10),
    });

    const llmRes = await generateWithFallback(
      prompt,
      modelKey,
      { maxTokens: 600, temperature: 0.2 },
      sessionApiKeys
    );

    const origBullets = sectionGroup.originalContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const { suggestions, tailoredBullets } = parseChunkBulletsResponse({
      llmText: llmRes.text,
      origBullets,
      sectionGroupId: sectionGroup.id,
      sectionGroupTitle: sectionGroup.title,
      jobIndex: sectionGroup.jobIndex,
      sortedMissingKeywords,
    });

    const updatedGroup: ResumeSectionGroup = {
      ...sectionGroup,
      status: "ready",
      suggestions,
      tailoredContent: tailoredBullets.join("\n"),
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
