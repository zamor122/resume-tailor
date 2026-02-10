import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { getJobTitleExtractionPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Initialize with Gemini 1.5 Flash-8B for efficient title extraction
async function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined');
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model =
    process.env.GEMINI_JOB_TITLE_MODEL ||
    process.env.DEFAULT_GEMINI_MODEL ||
    "gemini-2.5-flash-lite";
  return genAI.getGenerativeModel({ model });
}

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a more detailed job description"
      }, { status: 400 });
    }

    const model = await getModel();

    const prompt = getJobTitleExtractionPrompt(jobDescription);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    try {
      // Clean the response by removing markdown code blocks and any extra whitespace
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '') // Remove ```json or ``` markers
        .replace(/```\n?$/g, '')         // Remove ending ```
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      if (!parsedResponse.jobTitle || typeof parsedResponse.confidence !== 'number') {
        console.error('Invalid response format:', parsedResponse);
        throw new Error('Invalid response format');
      }

      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      return NextResponse.json({
        error: "Processing Error",
        message: "Failed to extract job title",
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Job title extraction error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to process job description",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 