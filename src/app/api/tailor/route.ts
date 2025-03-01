import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: NextRequest) {
  const currentTime = Date.now();

  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Missing resume or job description" },
        { status: 400 }
      );
    }

    // Prepare the prompt
    const prompt = `
      You are an expert ATS optimization specialist with years of experience helping candidates pass Applicant Tracking Systems.
      
      Your task is to transform the provided resume to maximize its relevancy score for the given job description. 
      Use a conversational, humanized yet professional tone, but focus primarily on:

      1. KEYWORD MATCHING: Identify and incorporate ALL key terms, skills, and qualifications from the job description
      2. QUANTIFICATION: Add specific metrics and achievements where possible
      3. TERMINOLOGY ALIGNMENT: Use the exact same terminology as the job description
      4. SKILL PRIORITIZATION: Reorder skills and experiences to highlight those most relevant to the job
      5. FORMATTING OPTIMIZATION: Use clear section headers and bullet points for maximum ATS readability
      
      The goal is to achieve as close to 100% relevancy match as possible while maintaining authenticity.
      
      Do not include any extra comments regarding clarification why something was added, removed or changed.
      Provide the tailored resume using markdown formatting (e.g., use bullet points for skills, use headers for each section, etc.).
      
      Additionally, please return a JSON object with the following structure:
      {
        "tailoredResume": "<Tailored Resume Content in Markdown Format>",
        "changes": [
          {
            "changeDescription": "<Short description of the change made>",
            "changeDetails": "<Details explaining what was changed and why>"
          }
        ]
      }

      The "tailoredResume" should be the formatted markdown resume.
      The "changes" array should list all specific changes you made to the resume in a concise manner.
      Each item in the "changes" array should contain:
        - "changeDescription": A brief description of the change (e.g., "Added missing keywords")
        - "changeDetails": A clear explanation of the change and why it was made
      
      Do not include any extra text or paragraphs—just return the data in the specified format.
    `;

    // Generate content without streaming
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { text: `Resume:\n${resume}` },
            { text: `Job Description:\n${jobDescription}` }
          ]
        }
      ]
    });

    const response = result.response;
    const text = response.text();

    // Try to parse the response as JSON
    try {
      // Check if the response is already valid JSON
      const jsonData = JSON.parse(text);
      return NextResponse.json(jsonData);
    } catch (e) {
      // If not valid JSON, try to extract JSON from the text
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const jsonData = JSON.parse(jsonStr);
          return NextResponse.json(jsonData);
        }
      } catch (e) {
        // If extraction fails, return the raw text
        return NextResponse.json({
          tailoredResume: text,
          changes: []
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Processing Error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
