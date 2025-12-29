import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = `
      Transform this resume into a compelling narrative that tells a story while maintaining professionalism and ATS compatibility.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact before/after examples for each section.
      - Require specific before/after examples for each section (full text, not summaries)
      - Provide narrative arc with concrete examples from the resume
      - Include storytelling technique explanations with exact examples
      - Show quantifiable achievement enhancements with specific numbers
      - Maintain ATS compatibility (keep keywords, structure)
      
      ${jobDescription ? `Target Job:\n${jobDescription.substring(0, 2000)}\n\n` : ''}
      
      Current Resume:
      ${resume.substring(0, 6000)}
      
      Analyze and enhance:
      1. Narrative flow and coherence (specific improvements)
      2. Impact storytelling (quantifiable achievements with exact numbers)
      3. Career progression narrative (specific progression story)
      4. Value proposition clarity (exact value statement)
      5. Emotional connection (while staying professional)
      6. Unique differentiators (specific differentiators)
      
      Return ONLY a JSON object:
      {
        "narrativeScore": <number 0-100, how compelling the story is>,
        "currentNarrative": {
          "theme": "<current career theme>",
          "strengths": ["strength1", ...],
          "weaknesses": ["weakness1", ...],
          "flow": "<smooth|choppy|inconsistent>"
        },
        "enhancedSections": [
          {
            "section": "<exact section name>",
            "original": "<complete original text from resume>",
            "enhanced": "<complete enhanced version with better storytelling>",
            "improvements": ["<specific improvement1>", ...],
            "impact": "<specific reason why this is better for narrative and ATS>",
            "storytellingTechniques": ["<technique1 used>", ...],
            "keywordsPreserved": <boolean, if keywords maintained>,
            "atsCompatible": <boolean>
          }
        ],
        "narrativeArc": {
          "beginning": "<how career started>",
          "middle": "<key growth moments>",
          "climax": "<peak achievements>",
          "resolution": "<current value proposition>"
        },
        "storytellingTechniques": [
          {
            "technique": "<technique name>",
            "description": "<what it does>",
            "example": "<example from enhanced resume>",
            "impact": "<why it works>"
          }
        ],
        "quantifiableAchievements": [
          {
            "achievement": "<specific achievement from resume>",
            "current": "<exact current statement>",
            "enhanced": "<exact enhanced version with numbers/metrics>",
            "impact": "<specific reason why better (more compelling, shows value)>",
            "metricsAdded": ["<metric1>", ...],
            "beforeNumbers": "<numbers in current version>",
            "afterNumbers": "<numbers in enhanced version>"
          }
        ],
        "valueProposition": {
          "current": "<current value prop>",
          "enhanced": "<enhanced value prop>",
          "differentiators": ["differentiator1", ...]
        },
        "recommendations": [
          {
            "priority": "<high|medium|low>",
            "suggestion": "<suggestion>",
            "expectedImpact": "<impact on narrative>"
          }
        ]
      }
    `;

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    let text;
    try {
      const result = await generateWithFallback(
        prompt,
        selectedModel,
        undefined,
        sessionApiKeys
      );
      text = result.text.trim();
    } catch (apiError: any) {
      // Handle quota/rate limit errors
      if (apiError?.status === 429 || apiError?.message?.includes('429') || apiError?.message?.includes('quota')) {
        console.error('Gemini API quota exceeded in resume storyteller:', apiError);
        
        // Return fallback response with basic narrative analysis
        return NextResponse.json({
          narrativeScore: 50,
          currentNarrative: {
            theme: "Professional career progression",
            strengths: ["Experience in relevant field", "Quantifiable achievements"],
            weaknesses: ["Could enhance storytelling", "Add more narrative flow"],
            flow: "structured"
          },
          enhancedSections: [],
          narrativeArc: {
            beginning: "Career start",
            middle: "Growth and development",
            climax: "Key achievements",
            resolution: "Current value proposition"
          },
          storytellingTechniques: [
            {
              technique: "Quantifiable Achievements",
              description: "Use numbers and metrics to show impact",
              example: "Increased revenue by 25%",
              impact: "Makes achievements more concrete and memorable"
            }
          ],
          quantifiableAchievements: [],
          valueProposition: {
            current: "Experienced professional",
            enhanced: "Results-driven professional with proven track record",
            differentiators: []
          },
          recommendations: [
            {
              priority: "high",
              suggestion: "Add quantifiable metrics to achievements",
              expectedImpact: "Improves narrative credibility"
            }
          ],
          quotaExceeded: true,
          message: "⚠️ API quota exceeded - using fallback analysis. Please wait and try again for full analysis.",
          timestamp: new Date().toISOString(),
        });
      }
      throw apiError;
    }

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      return NextResponse.json({
        narrativeScore: Math.min(100, Math.max(0, parsedResponse.narrativeScore || 0)),
        currentNarrative: parsedResponse.currentNarrative || {},
        enhancedSections: parsedResponse.enhancedSections || [],
        narrativeArc: parsedResponse.narrativeArc || {},
        storytellingTechniques: parsedResponse.storytellingTechniques || [],
        quantifiableAchievements: parsedResponse.quantifiableAchievements || [],
        valueProposition: parsedResponse.valueProposition || {},
        recommendations: parsedResponse.recommendations || [],
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse storyteller response:', text);
      
      return NextResponse.json({
        narrativeScore: 50,
        currentNarrative: {},
        enhancedSections: [],
        narrativeArc: {},
        storytellingTechniques: [],
        quantifiableAchievements: [],
        valueProposition: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Resume Storyteller error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to enhance resume storytelling",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

