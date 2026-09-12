import { NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";

export const runtime = "nodejs";

export interface SynthesizeSummaryPayload {
  assembledResume: string;
  jobDescription?: string;
  jobTitle?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
  modelKey?: string;
  sessionApiKeys?: Record<string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SynthesizeSummaryPayload;
    const {
      assembledResume,
      jobDescription = "",
      jobTitle,
      userRequestedKeywords = [],
      preferences,
      modelKey,
      sessionApiKeys,
    } = body;

    if (!assembledResume || (typeof assembledResume === "string" && !assembledResume.trim())) {
      return NextResponse.json({ error: "assembledResume is required" }, { status: 400 });
    }

    const prompt = getHolisticSummaryPrompt({
      assembledResume,
      jobDescription,
      jobTitle,
      userRequestedKeywords,
      preferences,
    });

    const llmRes = await generateWithFallback(
      prompt,
      modelKey,
      { maxTokens: 400, temperature: 0.2 },
      sessionApiKeys
    );

    const summaryText = llmRes.text.trim();
    const matchedKw = (userRequestedKeywords || []).filter((kw: string) =>
      summaryText.toLowerCase().includes(kw.toLowerCase())
    );

    return NextResponse.json({
      summaryText,
      rationale: "Synthesized holistic career arc aligning vetted experience with target job scope",
      keywords: matchedKw,
    });
  } catch (err: any) {
    console.error("[synthesize-summary] Failed to synthesize summary:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to synthesize summary" },
      { status: 500 }
    );
  }
}
