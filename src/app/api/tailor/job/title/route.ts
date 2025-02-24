import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: "gemini-pro" });

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || jobDescription.length < 100) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid Input",
          message: "Please provide a more detailed job description"
        }),
        { status: 400 }
      );
    }

    const prompt = `
      You are a job title analyzer. Given a job description, extract the most appropriate standardized job title.
      
      Rules:
      1. Return ONLY a JSON object with no additional text or explanation
      2. The JSON must be in this exact format: {"jobTitle": "string", "confidence": number}
      3. The job title should be standardized and widely recognized
      4. Confidence should be 1-100 based on clarity of the role
      5. Remove any level indicators (e.g., "Senior", "Lead") unless crucial to the role
      
      Example response:
      {"jobTitle": "Software Engineer", "confidence": 95}
      
      Job Description:
      ${jobDescription}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    try {
      // Handle potential markdown code block formatting
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedResponse = JSON.parse(jsonText);
      
      if (!parsedResponse.jobTitle || typeof parsedResponse.confidence !== 'number') {
        console.error('Invalid response structure:', jsonText);
        throw new Error('Invalid response format');
      }

      // Clean and standardize the job title
      const cleanedTitle = parsedResponse.jobTitle
        .replace(/^"?|"?$/g, '') // Remove quotes
        .replace(/\s+/g, ' ')    // Normalize spaces
        .trim();

      return new NextResponse(
        JSON.stringify({
          jobTitle: cleanedTitle,
          confidence: Math.min(100, Math.max(1, Math.round(parsedResponse.confidence)))
        }),
        { status: 200 }
      );

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Raw response:', text);
      return new NextResponse(
        JSON.stringify({
          error: "Processing Error",
          message: "Failed to parse job title from response",
          debug: { rawResponse: text }
        }),
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error extracting job title:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Processing Error",
        message: error instanceof Error ? error.message : "Failed to extract job title"
      }),
      { status: 500 }
    );
  }
} 