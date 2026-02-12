import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import { getEnhancementPrompt } from "@/app/prompts/enhancement";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      baseResume,
      originalResume,
      jobDescription,
      missingKeywords,
      keywordContext,
      metricsGuidance,
      sessionId,
    } = body as {
      baseResume: string;
      originalResume: string;
      jobDescription: string;
      missingKeywords?: string[];
      keywordContext?: string;
      metricsGuidance?: string;
      sessionId?: string;
    };

    if (!baseResume || !originalResume || !jobDescription) {
      return NextResponse.json(
        {
          error: "Invalid Input",
          message: "baseResume, originalResume, and jobDescription are required",
        },
        { status: 400 }
      );
    }

    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      undefined,
      req.nextUrl.origin
    );

    const prompt = getEnhancementPrompt(
      baseResume,
      originalResume,
      jobDescription,
      missingKeywords,
      metricsGuidance
    );

    const { text } = await generateWithFallback(
      prompt,
      selectedModel,
      { temperature: 0.3, maxTokens: 8192 },
      sessionApiKeys
    );

    const parsed = parseJSONFromText<{
      enhancedResume?: string;
      additions?: Array<{
        section: string;
        description: string;
        impact: string;
      }>;
    }>(text);

    if (!parsed?.enhancedResume) {
      return NextResponse.json({
        enhancedResume: baseResume,
        additions: [],
        timestamp: new Date().toISOString(),
      });
    }

    let enhancedResume = parsed.enhancedResume;

    // Additive-only validation: ensure base content is preserved (no removals)
    const baseWords = baseResume.trim().split(/\s+/).length;
    const enhancedWords = enhancedResume.trim().split(/\s+/).length;
    if (enhancedWords < baseWords * 0.9) {
      console.warn(
        "[job-relevancy-enhancer] Enhancement removed content; returning base resume",
        { baseWords, enhancedWords }
      );
      enhancedResume = baseResume;
    }

    return NextResponse.json({
      enhancedResume,
      additions: parsed.additions ?? [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[job-relevancy-enhancer] Error:", error);
    return NextResponse.json(
      {
        error: "Enhancement failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
