import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelProvider, isRateLimitError } from "@/app/services/ai-provider";
import { DEFAULT_MODEL } from "@/app/config/models";

// Cooldown period in milliseconds (e.g., 1 minute = 60000ms)
const COOLDOWN_PERIOD = 60000;
const COOKIE_NAME = 'last_tailor_request';

// Environment check - skip rate limiting in development
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

// Log in development to confirm rate limiting is off
if (isDevelopment) {
  console.log('[DEV MODE] Rate limiting disabled - cooldown checks skipped');
}

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60; // This sets the max duration to 60 seconds

export async function POST(req: NextRequest) {
  // Parse request body early so we can use it in error handlers
  let resume = "";
  let jobDescription = "";
  let sessionId: string | undefined;
  let modelKey: string | undefined;
  
  try {
    const body = await req.json();
    resume = body.resume || "";
    jobDescription = body.jobDescription || "";
    sessionId = body.sessionId;
    modelKey = body.modelKey;
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid JSON", message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  try {
    // Skip cooldown check in development mode
    // In dev mode, we bypass our application-level rate limiting
    // Note: Gemini API quota limits still apply (429 errors from Google)
    if (!isDevelopment) {
      const cookieStore = await cookies();
      const lastRequestCookie = cookieStore.get(COOKIE_NAME);
      
      if (lastRequestCookie) {
        const lastRequestTime = parseInt(lastRequestCookie.value, 10);
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastRequestTime;
        
        if (timeElapsed < COOLDOWN_PERIOD) {
          const timeRemaining = Math.ceil((COOLDOWN_PERIOD - timeElapsed) / 1000);
          return NextResponse.json(
            { 
              error: "Rate limit exceeded", 
              message: `Please wait ${timeRemaining} seconds before making another request.`,
              timeRemaining
            },
            { status: 429 }
          );
        }
      }
    } else {
      // Dev mode: Rate limiting is disabled
      console.log('[DEV MODE] Application rate limiting disabled - cooldown check skipped');
    }

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Missing resume or job description" },
        { status: 400 }
      );
    }

    // Set the cookie with the current timestamp
    const currentTime = Date.now();
    if (!isDevelopment) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, currentTime.toString(), {
        path: '/',
        maxAge: COOLDOWN_PERIOD / 1000, // Convert to seconds for cookie maxAge
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
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

    // Get session preferences for model selection
    let sessionApiKeys: Record<string, string> | undefined;
    let selectedModel = modelKey || DEFAULT_MODEL;
    
    if (sessionId) {
      try {
        const sessionResponse = await fetch(`${req.nextUrl.origin}/api/mcp/session-manager`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', sessionId }),
        });
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.session?.preferences?.modelPreferences?.defaultModel) {
            selectedModel = sessionData.session.preferences.modelPreferences.defaultModel;
          }
          if (sessionData.session?.preferences?.apiKeys) {
            sessionApiKeys = sessionData.session.preferences.apiKeys;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch session preferences:', e);
      }
    }

    // Generate content using the abstraction layer
    let text: string;
    
    try {
      const fullPrompt = `${prompt}\n\nResume:\n${resume}\n\nJob Description:\n${jobDescription}`;
      const result = await generateWithFallback(
        fullPrompt,
        selectedModel,
        undefined,
        sessionApiKeys
      );
      text = result.text;
    } catch (apiError: any) {
      // Log the full error for debugging
      console.error('Error in tailor API:', {
        message: apiError.message,
        status: apiError.status,
        model: selectedModel,
        error: apiError
      });

      // Extract error details
      const errorMessage = apiError.message || 'Unknown error occurred';
      const status = apiError.status;
      const suggestions = apiError.suggestions || {};

      // Return user-friendly error response
      return NextResponse.json({
        error: true,
        message: errorMessage,
        model: selectedModel,
        status: status,
        suggestions: {
          checkApiKey: suggestions.checkApiKey || false,
          switchModel: suggestions.switchModel || false,
          retryAfter: suggestions.retryAfter
        },
        tailoredResume: resume, // Return original resume
        changes: []
      }, { status: 400 }); // Return 400 for client errors
    }

    // Try to parse the response as JSON
    try {
      // Check if the response is already valid JSON
      const jsonData = JSON.parse(text);
      return NextResponse.json(jsonData);
    } catch  {
      // If not valid JSON, try to extract JSON from the text
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const jsonData = JSON.parse(jsonStr);
          return NextResponse.json(jsonData);
        }
      } catch {
        // If extraction fails, return the raw text
        return NextResponse.json({
          tailoredResume: text,
          changes: []
        });
      }
    }
  } catch (error) {
    // Check if it's a quota error that wasn't caught earlier
    if (isRateLimitError(error)) {
      const apiError = error as any;
      const retrySeconds = apiError.retryAfter || 30;
      
      return NextResponse.json({
        tailoredResume: resume || "",
        changes: [
          {
            changeDescription: "⚠️ API Quota Exceeded",
            changeDetails: `Unable to optimize resume due to API quota limits. You can retry immediately or wait ${retrySeconds} seconds for better results. Your original resume is preserved.`
          }
        ],
        quotaExceeded: true,
        retryAfter: retrySeconds,
        canRetryImmediately: true,
        message: `API quota exceeded. You can retry now or wait ${retrySeconds} seconds for optimal results.`
      }, { status: 200 });
    }
    
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
