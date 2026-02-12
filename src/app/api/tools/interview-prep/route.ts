import {getInterviewPrepPrompt} from "@/app/prompts";
import {generateWithFallback} from "@/app/services/model-fallback";
import {parseJSONFromText} from "@/app/utils/json-extractor";
import {getModelFromSession} from "@/app/utils/model-helper";
import {NextRequest, NextResponse} from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resume, sessionId, modelKey } = await req.json();
    
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Job description is required"
      }, { status: 400 });
    }

    const prompt = getInterviewPrepPrompt(resume || '', jobDescription);

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    const result = await generateWithFallback(
      prompt,
      selectedModel,
      undefined,
      sessionApiKeys
    );
    const text = result.text.trim();

    const parsedResponse = parseJSONFromText<Record<string, unknown>>(text);

    if (!parsedResponse) {
      console.error("Failed to parse interview prep response:", text);
      return NextResponse.json({
        behavioral: [],
        technical: [],
        situational: [],
        questionsToAsk: [],
        talkingPoints: [],
        redFlags: [],
        interviewTips: ["Prepare examples using the STAR method", "Research the company thoroughly"],
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize common LLM key variants
    const behavioral = (parsedResponse.behavioral ?? parsedResponse.behavioralQuestions ?? []) as unknown[];
    const technical = (parsedResponse.technical ?? parsedResponse.technicalQuestions ?? []) as unknown[];
    const situational = (parsedResponse.situational ?? parsedResponse.situationalQuestions ?? []) as unknown[];
    const questionsToAsk = (parsedResponse.questionsToAsk ?? parsedResponse.questions ?? []) as unknown[];
    const talkingPoints = (parsedResponse.talkingPoints ?? []) as unknown[];
    const redFlags = (parsedResponse.redFlags ?? []) as unknown[];
    const interviewTips = (parsedResponse.interviewTips ?? parsedResponse.tips ?? []) as unknown[];

    return NextResponse.json({
      behavioral: Array.isArray(behavioral) ? behavioral : [],
      technical: Array.isArray(technical) ? technical : [],
      situational: Array.isArray(situational) ? situational : [],
      questionsToAsk: Array.isArray(questionsToAsk) ? questionsToAsk : [],
      talkingPoints: Array.isArray(talkingPoints) ? talkingPoints : [],
      redFlags: Array.isArray(redFlags) ? redFlags : [],
      interviewTips: Array.isArray(interviewTips) ? interviewTips : ["Prepare examples using the STAR method", "Research the company thoroughly"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Interview Prep Generator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to generate interview prep",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

