import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
                Tailor this resume to match the given job description, making it more relevant and aligned with the job role. 
                Provide the tailored resume using markdown formatting (e.g., use bullet points for skills, use headers for each section, etc.).
                
                Additionally, please return a separate key-value object with the following structure:
                {
                  "tailoredResume": "<Tailored Resume Content in Markdown Format>",
                  "changes": [
                    {
                      "changeDescription": "<Short description of the change made>",
                      "changeDetails": "<Details explaining what was changed and why>"
                    },
                    // More changes in this format...
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
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to generate content");
    }

    // Extract response
    const tailoredResume = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response from AI.";
    const changes = data.candidates?.[0]?.content?.parts?.[1]?.text || [];

    // Return both tailoredResume and changes separately
    return NextResponse.json({
      tailoredResume,
      changes: changes ? JSON.parse(changes) : [] // Parse and return changes if they exist
    }, { status: 200 });

  } catch (error) {
    console.error("Error tailoring resume:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
