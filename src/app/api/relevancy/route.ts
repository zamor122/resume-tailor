import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function evaluateResumeRelevancy(resume: string, jobDescription: string): Promise<number> {
  try {
    const prompt = `
      You are an expert ATS (Applicant Tracking System) evaluator. Your task is to analyze how well a resume matches a job description.
      
      Job Description:
      """
      ${jobDescription}
      """
      
      Resume:
      """
      ${resume}
      """
      
      Evaluate how well this resume addresses the specific requirements, skills, and qualifications mentioned in the job description.
      Consider the following factors:
      1. Key skills and technologies mentioned in the job description that appear in the resume
      2. Required qualifications and how well they are addressed
      3. Relevant experience that matches job responsibilities
      4. Use of similar terminology and industry keywords
      
      Return ONLY a numerical score from 0-100 representing the percentage match between the resume and job requirements.
      Do not include any explanation, just the number.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract just the number from the response
    const score = parseInt(text.replace(/\D/g, ''));
    
    // Validate the score is within range
    if (isNaN(score) || score < 0 || score > 100) {
      console.error('Invalid score returned:', text);
      return 50; // Default fallback
    }
    
    return score;
  } catch (error) {
    console.error("Error evaluating resume relevancy:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  console.log('=== Starting new relevancy calculation ===');
  try {
    const { originalResume, tailoredResume, jobDescription } = await req.json();
    
    // Clean and validate texts
    const cleanText = (text: string) => {
      return text.trim();
    };

    const cleanedJob = cleanText(jobDescription);
    const cleanedOriginal = cleanText(originalResume);
    const cleanedTailored = cleanText(tailoredResume);

    console.log('Text lengths:', {
      job: cleanedJob.length,
      original: cleanedOriginal.length,
      tailored: cleanedTailored.length
    });

    // Evaluate both resumes against the job description
    console.log('Evaluating original resume...');
    const beforeScore = await evaluateResumeRelevancy(cleanedOriginal, cleanedJob);
    
    console.log('Evaluating tailored resume...');
    const afterScore = await evaluateResumeRelevancy(cleanedTailored, cleanedJob);

    console.log('Scores:', { before: beforeScore, after: afterScore });

    // Format the improvement
    const improvement = afterScore > beforeScore 
      ? `+${afterScore - beforeScore}%`
      : `-${beforeScore - afterScore}%`;

    return NextResponse.json({
      before: beforeScore,
      after: afterScore,
      improvement
    });

  } catch (error) {
    console.error('=== Relevancy calculation failed ===');
    console.error('Error details:', error);
    return NextResponse.json({
      error: "Failed to calculate relevancy scores",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}  