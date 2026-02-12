import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getATSSimulatorPrompt } from "@/app/prompts";
import { sanitizeResumeForATS } from "@/app/utils/atsSanitizer";

/**
 * Extract salvageable data from truncated ATS simulator JSON.
 * Used when JSON.parse fails due to output being cut off mid-response.
 */
function extractPartialATSResponse(truncatedText: string): {
  atsScore?: number;
  parsingAccuracy?: number;
  issues?: unknown[];
  recommendations?: unknown[];
} {
  const result: {
    atsScore?: number;
    parsingAccuracy?: number;
    issues?: unknown[];
    recommendations?: unknown[];
  } = {};

  const atsScoreMatch = truncatedText.match(/"atsScore"\s*:\s*(\d+)/);
  if (atsScoreMatch) {
    result.atsScore = Math.min(100, Math.max(0, parseInt(atsScoreMatch[1], 10)));
  }

  const parsingAccuracyMatch = truncatedText.match(/"parsingAccuracy"\s*:\s*(\d+)/);
  if (parsingAccuracyMatch) {
    result.parsingAccuracy = Math.min(100, Math.max(0, parseInt(parsingAccuracyMatch[1], 10)));
  }

  return result;
}

const WORD_TO_NUMBER: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

/**
 * Fix common AI JSON mistakes before parsing (e.g. "count": nine -> "count": 9).
 */
function sanitizeATSJson(text: string): string {
  return text.replace(
    /"count"\s*:\s*(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
    (_, word) => `"count": ${WORD_TO_NUMBER[word.toLowerCase()] ?? word}`
  );
}

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, sessionId, modelKey, source } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a resume with at least 100 characters"
      }, { status: 400 });
    }

    // "before": full sanitization (original often has bullets/dashes). "after": no sanitization - humanize stream already sanitizes; extra sanitization can hurt scores
    const resumeToScore = source === "before" ? sanitizeResumeForATS(resume) : resume;
    const prompt = getATSSimulatorPrompt(resumeToScore);

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    const result = await generateWithFallback(
      prompt,
      selectedModel,
      { maxTokens: 8192 },
      sessionApiKeys
    );
    const text = result.text.trim();

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      const sanitizedText = sanitizeATSJson(cleanedText);
      
      const parsedResponse = JSON.parse(sanitizedText);
      
      // Validate and enhance response
      return NextResponse.json({
        atsScore: Math.min(100, Math.max(0, parsedResponse.atsScore || 0)),
        parsingAccuracy: parsedResponse.parsingAccuracy || parsedResponse.atsScore || 0,
        atsSystemCompatibility: parsedResponse.atsSystemCompatibility || {},
        parsedData: parsedResponse.parsedData || {},
        sectionAnalysis: parsedResponse.sectionAnalysis || {},
        issues: parsedResponse.issues || [],
        keywords: parsedResponse.keywords || [],
        recommendations: parsedResponse.recommendations || [],
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse ATS simulator response:', text);

      const partial = extractPartialATSResponse(text);
      const emailMatch = resume.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      const phoneMatch = resume.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

      return NextResponse.json({
        atsScore: partial.atsScore ?? 70,
        parsingAccuracy: partial.parsingAccuracy ?? partial.atsScore ?? 70,
        atsSystemCompatibility: {},
        parsedData: {
          contactInfo: {
            email: emailMatch ? emailMatch[0] : null,
            phone: phoneMatch ? phoneMatch[0] : null,
          },
          skills: [],
          experience: [],
          education: [],
        },
        sectionAnalysis: {},
        issues: partial.issues ?? [],
        keywords: [],
        recommendations: partial.recommendations ?? ["Enable full parsing by using structured format"],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('ATS Simulator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to simulate ATS parsing",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

