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

import {
  parseChunkBulletsResponse,
  type RawChunkBulletItem,
} from "@/app/utils/chunkBulletParser";

export { parseChunkBulletsResponse, type RawChunkBulletItem };


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
