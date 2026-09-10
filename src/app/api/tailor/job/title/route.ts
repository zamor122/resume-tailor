import { NextRequest, NextResponse } from "next/server";
import { getJobTitleExtractionPrompt } from "@/app/prompts";
import { generateWithFallback } from "@/app/services/model-fallback";
import { parseJSONFromText } from "@/app/utils/json-extractor";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json(
        {
          error: "Invalid Input",
          message: "Please provide a more detailed job description",
        },
        { status: 400 }
      );
    }

    const prompt = getJobTitleExtractionPrompt(jobDescription);
    const result = await generateWithFallback(prompt, undefined, {
      maxTokens: 200,
      temperature: 0.1,
    });

    const parsedResponse = parseJSONFromText<{ jobTitle: string; confidence: number }>(result.text);

    if (!parsedResponse?.jobTitle) {
      return NextResponse.json({ jobTitle: "Professional", confidence: 0.5 });
    }

    return NextResponse.json({
      jobTitle: parsedResponse.jobTitle,
      confidence: typeof parsedResponse.confidence === "number" ? parsedResponse.confidence : 0.8,
    });
  } catch (error) {
    console.error("Job title extraction error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to process job description",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 