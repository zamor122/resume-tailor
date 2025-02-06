import { NextRequest, NextResponse } from "next/server";

let lastRequestTime: number | null = null; // Store the last request time

// Use Edge Runtime to avoid serverless function timeout
export const runtime = 'edge'; // Add edge runtime
export const maxDuration = 300; // Set max duration to 300 seconds

export async function POST(req: NextRequest) {
  const currentTime = Date.now();
  
  // Check if the last request was made within the last 60 seconds
  if (lastRequestTime && currentTime - lastRequestTime < 60000) {
    return NextResponse.json({ error: "Request made too soon", message: "Please wait before making another request." }, { status: 429 });
  }

  lastRequestTime = currentTime; // Update the last request time

  try {
    const controller = new AbortController();
    // Increase timeout to 30 seconds (leaving buffer for Edge Runtime's 30s limit)
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const { resume, jobDescription } = await req.json();

    // Validate content length (minimum 100 characters for each)
    if (!resume || resume.length < 100) {
      return NextResponse.json({ 
        error: "Invalid Input", 
        message: "Please provide a more detailed resume (minimum 100 characters)." 
      }, { status: 400 });
    }

    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({ 
        error: "Invalid Input", 
        message: "Please provide a more detailed job description (minimum 100 characters)." 
      }, { status: 400 });
    }

    // Prepare Gemini API request
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                Using a conversational, humanized yet professional tone, tailor this resume to match the given job description, making it more relevant and aligned with the job role. 
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
              `
            },
            { text: `Resume:\n${resume}` },
            { text: `Job Description:\n${jobDescription}` }
          ]
        }
      ]
    };

    // Call Gemini API
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data.error);
      throw new Error(data.error?.message || "Failed to generate content");
    }

    // Extract response
    const tailoredResumeText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response from AI.";
    
    // Parse the tailoredResumeText to extract the JSON object
    let tailoredResume, changes;
    try {
      const jsonString = tailoredResumeText.replace(/```json\n|\n```/g, '');
      const parsedData = JSON.parse(jsonString);
      tailoredResume = parsedData.tailoredResume || "Error: No resume generated.";
      changes = parsedData.changes || [];
    } catch (error) {
      console.error("Error parsing tailored resume:", error);
      tailoredResume = "Error: Unable to parse resume.";
      changes = [];
    }

    return NextResponse.json({
      tailoredResume,
      changes
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Timeout Error", 
        message: "Request took too long. Please try again." 
      }, { status: 408 });
    }
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Internal Server Error", message: errorMessage }, { status: 500 });
  }
}
