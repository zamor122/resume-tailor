import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { isRateLimitError } from "@/app/services/ai-provider";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getAIDetectionPrompt } from "@/app/prompts";

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

    const prompt = getAIDetectionPrompt(text);

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

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
      // Use improved JSON extraction that handles reasoning text
      const { parseJSONFromText } = await import('@/app/utils/json-extractor');
      const parsedResponse = parseJSONFromText(textResponse);
      
      if (!parsedResponse) {
        throw new Error('Could not extract valid JSON from response');
      }
      
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

