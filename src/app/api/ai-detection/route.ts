import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { isRateLimitError } from "@/app/services/ai-provider";
import { DEFAULT_MODEL } from "@/app/config/models";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, sessionId, modelKey } = await req.json();
    
    if (!text || text.length < 50) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide text with at least 50 characters"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the following text and determine if it appears to be written by AI or a human.
      
      Consider these factors:
      1. Natural language patterns and flow
      2. Repetitive phrases or structures
      3. Overly formal or generic language
      4. Lack of personal voice or unique expressions
      5. Perfect grammar without natural variations
      6. Generic buzzwords or corporate speak
      
      Return ONLY a JSON object with this exact format:
      {
        "aiScore": <number 0-100, where 0 is definitely human and 100 is definitely AI>,
        "confidence": <number 0-100, how confident you are in this assessment>,
        "indicators": ["indicator1", "indicator2", ...],
        "humanScore": <number 0-100, inverse of aiScore>
      }
      
      Text to analyze:
      ${text.substring(0, 5000)}
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
      // Handle quota/rate limit errors
      if (isRateLimitError(apiError)) {
        console.error('API quota exceeded:', apiError);
        
        // Return fallback detection with warning
        const aiIndicators = [
          /utilize|leverage|synergy|paradigm|robust|scalable/gi,
          /proven track record|results-driven|team player/gi,
          /exceeded expectations|above and beyond/gi,
        ];
        
        let aiScore = 0;
        aiIndicators.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) aiScore += matches.length * 5;
        });
        
        aiScore = Math.min(100, Math.max(0, aiScore));
        
        return NextResponse.json({
          aiScore: Math.round(aiScore),
          humanScore: Math.round(100 - aiScore),
          confidence: 30, // Lower confidence for fallback
          indicators: [
            '⚠️ API quota exceeded - using fallback detection',
            'Heuristic-based detection (less accurate)',
            'You can retry immediately or wait 30 seconds for better results'
          ],
          quotaExceeded: true,
          retryAfter: 30,
          canRetryImmediately: true
        });
      }
      throw apiError; // Re-throw if not a quota error
    }

    try {
      // Clean the response
      const cleanedText = textResponse
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      // Validate response structure
      if (typeof parsedResponse.aiScore !== 'number' || 
          parsedResponse.aiScore < 0 || 
          parsedResponse.aiScore > 100) {
        throw new Error('Invalid aiScore');
      }

      return NextResponse.json({
        aiScore: Math.round(parsedResponse.aiScore),
        humanScore: Math.round(parsedResponse.humanScore || (100 - parsedResponse.aiScore)),
        confidence: Math.round(parsedResponse.confidence || 75),
        indicators: parsedResponse.indicators || [],
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', textResponse);
      
      // Fallback: simple heuristic-based detection
      const aiIndicators = [
        /utilize|leverage|synergy|paradigm|robust|scalable/gi,
        /proven track record|results-driven|team player/gi,
        /exceeded expectations|above and beyond/gi,
      ];
      
      let aiScore = 0;
      aiIndicators.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) aiScore += matches.length * 5;
      });
      
      aiScore = Math.min(100, Math.max(0, aiScore));
      
      return NextResponse.json({
        aiScore: Math.round(aiScore),
        humanScore: Math.round(100 - aiScore),
        confidence: 50,
        indicators: ['Heuristic-based detection'],
      });
    }
  } catch (error) {
    console.error('AI detection error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze text",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

