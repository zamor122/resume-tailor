import { NextRequest, NextResponse } from "next/server";
import { getModelFromSession } from "@/app/utils/model-helper";
import { generateContentWithFallback } from "@/app/services/ai-provider";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import { getResumeValidationPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

interface ValidationResult {
  isValid: boolean;
  flaggedItems: Array<{
    type: 'hallucination' | 'fabrication' | 'metric' | 'technology' | 'company';
    description: string;
    location: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const { originalResume, tailoredResume } = await req.json();

    if (!originalResume || !tailoredResume) {
      return NextResponse.json(
        { error: "Both original and tailored resumes are required" },
        { status: 400 }
      );
    }

    const reqOrigin = req.headers.get('origin') || req.nextUrl.origin;
    const { modelKey } = await getModelFromSession(undefined, undefined, reqOrigin);

    const validationPrompt = getResumeValidationPrompt(originalResume, tailoredResume);

    const validationResult = await generateContentWithFallback(validationPrompt, modelKey);
    const validationData = parseJSONFromText<ValidationResult>(validationResult.text);

    if (!validationData) {
      return NextResponse.json(
        { error: "Could not validate resume" },
        { status: 500 }
      );
    }

    return NextResponse.json(validationData);

  } catch (error) {
    console.error("Error in resume validation:", error);
    return NextResponse.json(
      {
        error: "Failed to validate resume",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}



