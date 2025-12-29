import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { isRateLimitError } from "@/app/services/ai-provider";
import { DEFAULT_MODEL } from "@/app/config/models";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

interface ClassificationResult {
  type: "resume" | "job_description" | "mixed" | "unclear";
  confidence: number;
  reasoning: string[];
  extractedData: {
    resume?: {
      name?: string;
      email?: string;
      phone?: string;
      sections?: string[];
      hasExperience?: boolean;
      hasEducation?: boolean;
      hasSkills?: boolean;
    };
    jobDescription?: {
      jobTitle?: string;
      company?: string;
      location?: string;
      hasRequirements?: boolean;
      hasResponsibilities?: boolean;
      hasQualifications?: boolean;
    };
  };
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { text, existingContext, sessionId, modelKey } = await req.json();
    
    if (!text || text.length < 50) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide text with at least 50 characters"
      }, { status: 400 });
    }

    const contextHint = existingContext 
      ? `\n\nContext: User has already provided a ${existingContext.type === "resume" ? "resume" : "job description"}. This new text is likely a ${existingContext.type === "resume" ? "job description" : "resume"}.`
      : "";

    const prompt = `
      Analyze the following text and determine if it is a RESUME, JOB DESCRIPTION, MIXED CONTENT, or UNCLEAR.
      
      ${contextHint}
      
      Key indicators for RESUME:
      - Personal information (name, email, phone, address)
      - Professional summary or objective
      - Work experience with dates and companies
      - Education history with degrees and institutions
      - Skills section (technical, soft skills)
      - First-person or third-person professional narrative
      - Achievement-focused language
      - Past tense for completed work
      
      Key indicators for JOB DESCRIPTION:
      - Job title prominently featured
      - Company name and location
      - "We are looking for" or "Requirements" sections
      - "Responsibilities" or "Duties" sections
      - "Qualifications" or "Requirements" lists
      - Salary range or benefits mentioned
      - Application instructions
      - Future-oriented language ("You will", "The role requires")
      - Company description or mission
      
      Analyze the text structure, content patterns, and language to make a confident determination.
      
      Return ONLY a JSON object with this exact format:
      {
        "type": "<resume|job_description|mixed|unclear>",
        "confidence": <number 0-100, how confident you are>,
        "reasoning": [
          "<reason 1>",
          "<reason 2>",
          ...
        ],
        "extractedData": {
          "resume": {
            "name": "<extracted name or null>",
            "email": "<extracted email or null>",
            "phone": "<extracted phone or null>",
            "sections": ["<section1>", ...],
            "hasExperience": <boolean>,
            "hasEducation": <boolean>,
            "hasSkills": <boolean>
          },
          "jobDescription": {
            "jobTitle": "<extracted job title or null>",
            "company": "<extracted company name or null>",
            "location": "<extracted location or null>",
            "hasRequirements": <boolean>,
            "hasResponsibilities": <boolean>,
            "hasQualifications": <boolean>
          }
        },
        "suggestions": [
          "<suggestion 1>",
          ...
        ]
      }
      
      Text to analyze:
      ${text.substring(0, 10000)}
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

    let textResponse: string;
    
    try {
      const result = await generateWithFallback(
        prompt,
        selectedModel,
        undefined,
        sessionApiKeys
      );
      textResponse = result.text.trim();
    } catch (apiError: any) {
      // Log the full error for debugging
      console.error('Error in classify-content API:', {
        message: apiError.message,
        status: apiError.status,
        model: selectedModel,
        error: apiError
      });

      // Return error response - classification will fail gracefully
      return NextResponse.json({
        error: true,
        message: apiError.message || 'Failed to classify content',
        model: selectedModel,
        status: apiError.status,
        suggestions: {
          checkApiKey: true,
          switchModel: true
        },
        type: "unclear",
        confidence: 0
      }, { status: 400 });
    }

    try {
      const cleanedText = textResponse
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse: ClassificationResult = JSON.parse(cleanedText);
      
      // Validate and enhance response
      const classification: ClassificationResult = {
        type: parsedResponse.type || "unclear",
        confidence: Math.min(100, Math.max(0, parsedResponse.confidence || 0)),
        reasoning: parsedResponse.reasoning || [],
        extractedData: parsedResponse.extractedData || {
          resume: {},
          jobDescription: {}
        },
        suggestions: parsedResponse.suggestions || []
      };

      // If context exists and suggests different type, adjust confidence
      if (existingContext && classification.type === existingContext.type) {
        classification.confidence = Math.max(0, classification.confidence - 20);
        classification.suggestions.push(
          `You already provided a ${existingContext.type}. This might be a ${existingContext.type === "resume" ? "job description" : "resume"} instead.`
        );
      }

      return NextResponse.json(classification);
    } catch (parseError) {
      console.error('Failed to parse classification response:', textResponse);
      
      // Fallback: heuristic-based classification
      const lowerText = text.toLowerCase();
      const resumeIndicators = [
        /email.*@/i,
        /phone|mobile|cell/i,
        /experience|work history|employment/i,
        /education|degree|university|college/i,
        /skills|technical skills|proficiencies/i,
        /summary|objective|profile/i
      ];
      
      const jobDescIndicators = [
        /we are looking for|seeking/i,
        /requirements|qualifications/i,
        /responsibilities|duties|you will/i,
        /salary|compensation|benefits/i,
        /apply now|how to apply/i,
        /company|organization|about us/i
      ];
      
      const resumeScore = resumeIndicators.filter(regex => regex.test(text)).length;
      const jobDescScore = jobDescIndicators.filter(regex => regex.test(text)).length;
      
      let type: "resume" | "job_description" | "mixed" | "unclear" = "unclear";
      let confidence = 50;
      
      if (resumeScore > jobDescScore && resumeScore >= 3) {
        type = "resume";
        confidence = Math.min(90, 50 + (resumeScore * 10));
      } else if (jobDescScore > resumeScore && jobDescScore >= 3) {
        type = "job_description";
        confidence = Math.min(90, 50 + (jobDescScore * 10));
      } else if (resumeScore === jobDescScore && resumeScore >= 2) {
        type = "mixed";
        confidence = 60;
      }
      
      return NextResponse.json({
        type,
        confidence,
        reasoning: [
          `Found ${resumeScore} resume indicators and ${jobDescScore} job description indicators`,
          "Using heuristic fallback classification"
        ],
        extractedData: {
          resume: {},
          jobDescription: {}
        },
        suggestions: [
          "Please provide clearer content or specify the type manually"
        ]
      });
    }
  } catch (error) {
    console.error('Content Classification error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to classify content",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

