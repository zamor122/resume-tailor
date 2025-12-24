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
    const { resume, jobDescription, currentScore } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = `
      You are an ATS optimization expert. Analyze this resume and provide REAL-TIME, ACTIONABLE suggestions to improve its ATS compatibility score.
      
      Current ATS Score: ${currentScore || "Not provided"}
      
      ${jobDescription ? `Target Job Description:\n${jobDescription.substring(0, 3000)}\n\n` : ''}
      
      Resume:
      ${resume.substring(0, 8000)}
      
      Provide specific, implementable suggestions that will immediately improve the ATS score.
      
      Return ONLY a JSON object:
      {
        "currentScore": ${currentScore || 0},
        "projectedScore": <number 0-100 after implementing suggestions>,
        "quickWins": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action to take>",
            "location": "<where in resume>",
            "impact": <number 1-10, score improvement>,
            "effort": "<low|medium|high>",
            "example": "<before> → <after>"
          }
        ],
        "keywordOptimization": {
          "missing": ["keyword1", "keyword2", ...],
          "underused": ["keyword1", ...],
          "overused": ["keyword1", ...],
          "suggestions": [
            {
              "keyword": "<keyword>",
              "currentCount": <number>,
              "recommendedCount": <number>,
              "whereToAdd": "<section>",
              "context": "<how to naturally incorporate>"
            }
          ]
        },
        "formatting": {
          "issues": [
            {
              "type": "<issue type>",
              "severity": "<critical|high|medium|low>",
              "description": "<what's wrong>",
              "fix": "<exact fix>",
              "lineNumber": <approximate line>
            }
          ],
          "recommendations": ["rec1", ...]
        },
        "structure": {
          "sections": ["section1", ...],
          "missingSections": ["section1", ...],
          "order": "<optimal|suboptimal>",
          "recommendations": ["rec1", ...]
        },
        "content": {
          "strengths": ["strength1", ...],
          "weaknesses": ["weakness1", ...],
          "suggestions": [
            {
              "section": "<section name>",
              "current": "<current content snippet>",
              "improved": "<improved version>",
              "reason": "<why this is better>"
            }
          ]
        },
        "implementationPlan": [
          {
            "step": <number>,
            "action": "<action>",
            "estimatedTime": "<time>",
            "expectedImpact": <score improvement>
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      // Calculate total potential improvement
      const totalImpact = parsedResponse.quickWins?.reduce((sum: number, win: any) => sum + (win.impact || 0), 0) || 0;
      const projectedScore = Math.min(100, (parsedResponse.currentScore || 0) + totalImpact);
      
      return NextResponse.json({
        currentScore: parsedResponse.currentScore || currentScore || 0,
        projectedScore: parsedResponse.projectedScore || projectedScore,
        quickWins: parsedResponse.quickWins || [],
        keywordOptimization: parsedResponse.keywordOptimization || {},
        formatting: parsedResponse.formatting || {},
        structure: parsedResponse.structure || {},
        content: parsedResponse.content || {},
        implementationPlan: parsedResponse.implementationPlan || [],
        potentialImprovement: projectedScore - (parsedResponse.currentScore || currentScore || 0),
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse ATS optimizer response:', text);
      
      return NextResponse.json({
        currentScore: currentScore || 0,
        projectedScore: currentScore || 0,
        quickWins: [],
        keywordOptimization: {},
        formatting: {},
        structure: {},
        content: {},
        implementationPlan: [],
        potentialImprovement: 0,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('ATS Optimizer error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to optimize ATS score",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

