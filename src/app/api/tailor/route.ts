import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let lastRequestTime: number | null = null; // Store the last request time

// Use Edge Runtime to avoid serverless function timeout
export const runtime = 'edge'; // Add edge runtime
export const maxDuration = 300; // Set max duration to 300 seconds

// Add environment check
const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(req: NextRequest) {
  const currentTime = Date.now();
  
  // Only apply rate limiting in production
  if (!isDevelopment) {
    // Check if the last request was made within the last 60 seconds
    if (lastRequestTime && currentTime - lastRequestTime < 60000) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Request made too soon", 
          message: "Please wait before making another request." 
        }), 
        { status: 429 }
      );
    }
  }

  lastRequestTime = currentTime; // Update the last request time

  try {
    const { resume, jobDescription } = await req.json();

    // Validate content length (minimum 100 characters for each)
    if (!resume || resume.length < 100) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid Input",
          message: "Please provide a more detailed resume (minimum 100 characters)."
        }),
        { status: 400 }
      );
    }

    if (!jobDescription || jobDescription.length < 100) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid Input",
          message: "Please provide a more detailed job description (minimum 100 characters)."
        }),
        { status: 400 }
      );
    }

    // Prepare the prompt (using the same prompt as before)
    const prompt = `
      Using a conversational, humanized yet professional tone, tailor this resume to match the given job description, making it significantly more relevant and aligned with the job role. 
      Do not include any extra comments regarding clarification why something was added, removed or changed.
      Specifically, focus on the key points in the job description by finding the qualifications and skills necessary to alter the resume to pass the ATS and be the best candidate for the position.
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
        - "changeDescription": A brief description of the change (e.g., "Removed irrelevant skills")
        - "changeDetails": A clear explanation of the change and why it was made
      
      Do not include any extra text or paragraphs—just return the data in the specified format.
    `;

    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the streaming response
    const response = await model.generateContentStream({
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

    // Process the stream
    (async () => {
      try {
        let accumulatedText = '';

        for await (const chunk of response.stream) {
          if (chunk.text) {
            const text = chunk.text();
            accumulatedText += text;
            
            // Split by newlines and look for complete lines
            const lines = accumulatedText.split('\n');
            
            // Keep the last (potentially incomplete) line
            accumulatedText = lines.pop() || '';
            
            // Process complete lines
            for (const line of lines) {
              const cleanedLine = line.trim();
              if (cleanedLine) {
                const encoder = new TextEncoder();
                await writer.write(encoder.encode(cleanedLine + '\n'));
              }
            }
          }
        }

        // Send any remaining text
        if (accumulatedText.trim()) {
          const encoder = new TextEncoder();
          await writer.write(encoder.encode(accumulatedText.trim() + '\n'));
        }
      } catch (error) {
        const errorResponse = JSON.stringify({
          error: "Processing Error",
          message: error instanceof Error ? error.message : "An unknown error occurred",
          details: error instanceof Error ? error.stack : undefined
        });
        await writer.write(new TextEncoder().encode(errorResponse + '\n'));
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { status: 500 }
    );
  }
}
