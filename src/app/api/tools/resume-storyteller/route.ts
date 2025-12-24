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

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = `
      Transform this resume into a compelling narrative that tells a story while maintaining professionalism and ATS compatibility.
      
      ${jobDescription ? `Target Job:\n${jobDescription.substring(0, 2000)}\n\n` : ''}
      
      Current Resume:
      ${resume.substring(0, 6000)}
      
      Analyze and enhance:
      1. Narrative flow and coherence
      2. Impact storytelling (quantifiable achievements)
      3. Career progression narrative
      4. Value proposition clarity
      5. Emotional connection (while staying professional)
      6. Unique differentiators
      
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
            "section": "<section name>",
            "original": "<original text>",
            "enhanced": "<enhanced version with better storytelling>",
            "improvements": ["improvement1", ...],
            "impact": "<why this is better>"
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
            "achievement": "<achievement>",
            "current": "<how it's currently stated>",
            "enhanced": "<more compelling version>",
            "impact": "<why better>"
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

    let result;
    let response;
    let text;
    
    try {
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text().trim();
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

