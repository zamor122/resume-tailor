import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, currentScore, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = `
      You are an ATS optimization expert. Analyze this resume and provide REAL-TIME, ACTIONABLE suggestions to improve its ATS compatibility score.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact numbers, percentages, timeframes, and concrete examples.
      - Require specific score improvements per action (e.g., "+5 points", not "improves score")
      - Provide exact before/after examples with full text
      - Include time estimates for each fix (e.g., "2 minutes", "15 minutes")
      - Calculate ROI (score gain / time invested)
      
      Current ATS Score: ${currentScore || "Not provided"}
      
      ${jobDescription ? `Target Job Description:\n${jobDescription.substring(0, 3000)}\n\n` : ''}
      
      Resume:
      ${resume.substring(0, 8000)}
      
      Return ONLY a JSON object:
      {
        "currentScore": ${currentScore || 0},
        "projectedScore": <number 0-100 after implementing all suggestions>,
        "quickWins": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action to take>",
            "location": "<exact location: section name, line number, or character position>",
            "impact": <number, exact points added to score (e.g., 5, 10, 15)>,
            "effort": "<low|medium|high>",
            "timeEstimate": "<specific time estimate, e.g., '2 minutes', '15 minutes', '1 hour'>",
            "roi": <number, impact points per minute>,
            "before": "<exact current text>",
            "after": "<exact improved text>",
            "reason": "<why this improves ATS parsing>"
          }
        ],
        "keywordOptimization": {
          "missing": [
            {
              "keyword": "<keyword>",
              "importance": "<critical|high|medium|low>",
              "expectedImpact": <points added>,
              "suggestedLocations": ["<section1>", "<section2>"]
            }
          ],
          "underused": [
            {
              "keyword": "<keyword>",
              "currentCount": <exact number>,
              "recommendedCount": <exact number>,
              "whereToAdd": "<specific section or location>",
              "context": "<exact phrase or sentence showing how to naturally incorporate>",
              "expectedImpact": <points added>
            }
          ],
          "overused": [
            {
              "keyword": "<keyword>",
              "currentCount": <exact number>,
              "recommendedCount": <exact number>,
              "whereToRemove": "<specific location>",
              "reason": "<why reducing helps>"
            }
          ]
        },
        "formatting": {
          "issues": [
            {
              "type": "<issue type>",
              "severity": "<critical|high|medium|low>",
              "description": "<specific issue description>",
              "location": "<exact location: line number, section, or character position>",
              "fix": "<exact fix with full text example>",
              "before": "<current problematic text>",
              "after": "<fixed text>",
              "impact": <points added>,
              "timeEstimate": "<time to fix>"
            }
          ]
        },
        "structure": {
          "sections": ["<section1>", ...],
          "missingSections": [
            {
              "section": "<section name>",
              "importance": "<critical|high|medium|low>",
              "expectedImpact": <points added>,
              "suggestedContent": "<example content>"
            }
          ],
          "order": "<optimal|suboptimal>",
          "recommendedOrder": ["<section1>", "<section2>", ...],
          "expectedImpact": <points added if reordered>
        },
        "content": {
          "strengths": ["<specific strength>", ...],
          "weaknesses": ["<specific weakness>", ...],
          "suggestions": [
            {
              "section": "<section name>",
              "current": "<exact current content snippet>",
              "improved": "<exact improved version>",
              "reason": "<specific reason why this is better for ATS>",
              "impact": <points added>
            }
          ]
        },
        "implementationPlan": [
          {
            "step": <number>,
            "action": "<specific action>",
            "estimatedTime": "<exact time estimate, e.g., '2 minutes'>",
            "expectedImpact": <exact points added>,
            "priority": "<critical|high|medium|low>",
            "dependencies": ["<step numbers this depends on>"]
          }
        ],
        "priorityMatrix": {
          "highImpactLowEffort": [<quick win indices>],
          "highImpactHighEffort": [<indices>],
          "lowImpactLowEffort": [<indices>],
          "lowImpactHighEffort": [<indices>]
        }
      }
    `;

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    const result = await generateWithFallback(
      prompt,
      selectedModel,
      undefined,
      sessionApiKeys
    );
    const text = result.text.trim();

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
        priorityMatrix: parsedResponse.priorityMatrix || {},
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

