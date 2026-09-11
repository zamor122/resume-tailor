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

    try {
      const prompt = getJobTitleExtractionPrompt(jobDescription);
      const result = await generateWithFallback(prompt, undefined, {
        maxTokens: 200,
        temperature: 0.1,
      });

      const parsedResponse = parseJSONFromText<{ jobTitle: string; confidence: number }>(result.text);

      if (parsedResponse?.jobTitle) {
        return NextResponse.json({
          jobTitle: parsedResponse.jobTitle,
          confidence: typeof parsedResponse.confidence === "number" ? parsedResponse.confidence : 0.8,
        });
      }
    } catch (llmError) {
      console.warn("LLM job title extraction failed, using heuristic extraction:", llmError);
    }

    // Heuristic Fallback: Extract from the first few non-empty lines of job description
    const firstLines = jobDescription
      .split("\n")
      .map((l: string) => l.trim().replace(/^#+\s*/, "").replace(/^Title:\s*/i, "").replace(/^Role:\s*/i, ""))
      .filter((l: string) => l.length > 3 && l.length < 80);

    const titleKeywords = /(engineer|developer|manager|lead|architect|designer|analyst|director|scientist|consultant|specialist|officer|administrator|coordinator|associate)/i;
    const matchedLine = firstLines.find((line: string) => titleKeywords.test(line));

    const fallbackTitle = matchedLine || firstLines[0] || "Professional";

    return NextResponse.json({
      jobTitle: fallbackTitle,
      confidence: 0.6,
    });
  } catch (error) {
    console.error("Job title extraction error:", error);
    return NextResponse.json({
      jobTitle: "Professional",
      confidence: 0.5,
    });
  }
} 