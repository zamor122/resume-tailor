import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { stripModelThinking } from "@/app/utils/stripModelThinking";
import {
  buildElicitationQuestionPrompt,
  fallbackElicitationQuestions,
  parseElicitationQuestions,
} from "@/app/utils/elicitation";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 60;

/**
 * Generate 3-5 plain-English elicitation questions for THIS resume + THIS job.
 *
 * Never fails the user: if the model is unavailable or returns nothing usable we
 * return the generic fallback questions, so the "A few things your resume didn't
 * say" screen always has honest, number-free questions to show.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resume: string = typeof body?.resume === "string" ? body.resume : "";
    const jobDescription: string =
      typeof body?.jobDescription === "string" ? body.jobDescription : "";
    const jobTitle: string | undefined =
      typeof body?.jobTitle === "string" ? body.jobTitle : undefined;

    if (resume.trim().length < 50 || jobDescription.trim().length < 50) {
      return NextResponse.json({ questions: fallbackElicitationQuestions(), source: "fallback" });
    }

    try {
      const prompt = buildElicitationQuestionPrompt(resume, jobDescription, jobTitle);
      const res = await generateWithFallback(prompt, undefined, {
        maxTokens: 400,
        temperature: 0.4,
      });
      const questions = parseElicitationQuestions(stripModelThinking(res.text || ""));
      if (questions.length > 0) {
        return NextResponse.json({ questions, source: "generated" });
      }
    } catch (err) {
      console.warn("[Elicitation] Question generation failed, using fallback:", err);
    }

    return NextResponse.json({ questions: fallbackElicitationQuestions(), source: "fallback" });
  } catch (error) {
    console.error("[Elicitation] Error:", error);
    return NextResponse.json({ questions: fallbackElicitationQuestions(), source: "fallback" });
  }
}
