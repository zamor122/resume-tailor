import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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
    const { text, existingContext } = await req.json();
    
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

    let result;
    let response;
    let textResponse;
    
    try {
      result = await model.generateContent(prompt);
      response = await result.response;
      textResponse = response.text().trim();
    } catch (apiError: any) {
      // Handle quota/rate limit errors
      if (apiError?.status === 429 || apiError?.message?.includes('429') || apiError?.message?.includes('quota')) {
        console.error('Gemini API quota exceeded:', apiError);
        
        // Return fallback classification with warning
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
        let confidence = 30; // Lower confidence for fallback
        
        if (resumeScore > jobDescScore && resumeScore >= 2) {
          type = "resume";
          confidence = Math.min(70, 30 + (resumeScore * 8));
        } else if (jobDescScore > resumeScore && jobDescScore >= 2) {
          type = "job_description";
          confidence = Math.min(70, 30 + (jobDescScore * 8));
        } else if (resumeScore === jobDescScore && resumeScore >= 1) {
          type = "mixed";
          confidence = 50;
        }
        
        return NextResponse.json({
          type,
          confidence,
          reasoning: [
            "⚠️ API quota exceeded - using fallback classification",
            `Found ${resumeScore} resume indicators and ${jobDescScore} job description indicators`,
            "Classification may be less accurate. You can retry now or wait for quota reset."
          ],
          extractedData: {
            resume: {},
            jobDescription: {}
          },
          suggestions: [
            "You can retry immediately - the system will attempt again",
            "For best results, wait 30 seconds before retrying",
            "Fallback classification is working but less accurate than AI"
          ],
          quotaExceeded: true,
          retryAfter: 30,
          canRetryImmediately: true
        });
      }
      throw apiError; // Re-throw if not a quota error
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

