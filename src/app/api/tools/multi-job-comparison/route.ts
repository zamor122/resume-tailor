import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 90; // Longer for multiple jobs

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescriptions, jobDescription, sessionId, modelKey } = await req.json();
    
    // Handle both single jobDescription and array of jobDescriptions
    let jobDescs: any[] = [];
    if (jobDescriptions && Array.isArray(jobDescriptions)) {
      jobDescs = jobDescriptions;
    } else if (jobDescription) {
      // If single job description provided, allow comparison with just one
      // But suggest they add more for better comparison
      jobDescs = [jobDescription];
    }
    
    if (!resume || jobDescs.length === 0) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume and at least 1 job description are required. For best results, provide 2 or more job descriptions."
      }, { status: 400 });
    }
    
    // If only one job description, provide helpful message but still process
    if (jobDescs.length === 1) {
      // Still process, but note it's a single job comparison
      console.log('Multi-job comparison with single job - consider adding more for better insights');
    }

    if (jobDescs.length > 10) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Maximum 10 job descriptions allowed"
      }, { status: 400 });
    }

    const prompt = `
      Compare this resume against multiple job descriptions simultaneously and provide comprehensive insights.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact match scores, percentages, and specific recommendations.
      - Require specific match scores for each job (0-100 with breakdown)
      - Provide common skill/requirement analysis with exact percentages
      - Include versatility score calculation with methodology
      - Suggest resume versions for different job clusters with specific changes
      - Provide specific optimization strategies with expected improvements
      
      Resume:
      ${resume.substring(0, 5000)}
      
      Job Descriptions:
      ${jobDescs.map((job: any, index: number) => {
        const jobText = typeof job === 'string' ? job : (job.description || job.title || JSON.stringify(job));
        return `Job ${index + 1}:\n${jobText.substring(0, 2000)}`;
      }).join('\n\n---\n\n')}
      
      Return ONLY a JSON object:
      {
        "overallAnalysis": {
          "bestMatch": <job index (0-based)>,
          "worstMatch": <job index>,
          "averageMatch": <number 0-100>,
          "matchRange": "<low-high>",
          "versatility": <number 0-100, how well resume fits multiple roles>
        },
        "jobComparisons": [
          {
            "jobIndex": <number>,
            "jobTitle": "<exact job title>",
            "matchScore": <number 0-100, exact score>,
            "matchBreakdown": {
              "skills": <number 0-100>,
              "experience": <number 0-100>,
              "education": <number 0-100>,
              "keywords": <number 0-100>
            },
            "strengths": [
              {
                "strength": "<specific strength>",
                "evidence": "<evidence from resume>",
                "impact": "<how this helps>"
              }
            ],
            "gaps": [
              {
                "gap": "<specific gap>",
                "importance": "<critical|high|medium|low>",
                "impact": "<how this hurts match>"
              }
            ],
            "uniqueRequirements": [
              {
                "requirement": "<exact requirement>",
                "inResume": <boolean>,
                "importance": "<critical|high|medium|low>"
              }
            ],
            "commonRequirements": [
              {
                "requirement": "<exact requirement>",
                "frequency": <number, how many jobs require this>,
                "inResume": <boolean>
              }
            ],
            "recommendations": [
              {
                "recommendation": "<specific recommendation>",
                "priority": "<high|medium|low>",
                "expectedImprovement": <points added to score>
              }
            ]
          }
        ],
        "commonThemes": {
          "requiredSkills": ["skill1", ...],
          "commonKeywords": ["keyword1", ...],
          "sharedRequirements": ["req1", ...],
          "industryTrends": ["trend1", ...]
        },
        "optimizationStrategy": {
          "universalImprovements": [
            {
              "action": "<specific action>",
              "impact": "<specific impact on all jobs, e.g., '+5 points average'>",
              "priority": "<critical|high|medium|low>",
              "implementation": "<how to implement>",
              "timeEstimate": "<time to implement>"
            }
          ],
          "jobSpecificOptimizations": [
            {
              "jobIndex": <number>,
              "optimizations": [
                {
                  "optimization": "<specific optimization>",
                  "action": "<exact action to take>",
                  "expectedImprovement": <exact points added>,
                  "example": "<before> → <after>"
                }
              ],
              "expectedImprovement": <exact score increase>
            }
          ],
          "resumeVersions": [
            {
              "version": "<exact version name>",
              "targetJobs": [<exact job indices>],
              "keyChanges": [
                {
                  "change": "<specific change>",
                  "section": "<section name>",
                  "before": "<current text>",
                  "after": "<new text>",
                  "reason": "<why this helps these jobs>"
                }
              ],
              "expectedMatch": <exact average score>,
              "versatilityScore": <number 0-100>
            }
          ]
        },
        "insights": {
          "careerFit": "<analysis>",
          "marketPositioning": "<analysis>",
          "skillGaps": ["gap1", ...],
          "opportunities": ["opp1", ...]
        },
        "recommendations": [
          {
            "type": "<universal|specific>",
            "priority": "<high|medium|low>",
            "recommendation": "<recommendation>",
            "appliesTo": [<job indices or "all">]
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
      
      return NextResponse.json({
        overallAnalysis: parsedResponse.overallAnalysis || {},
        jobComparisons: parsedResponse.jobComparisons || [],
        commonThemes: parsedResponse.commonThemes || {},
        optimizationStrategy: parsedResponse.optimizationStrategy || {},
        insights: parsedResponse.insights || {},
        recommendations: parsedResponse.recommendations || [],
        totalJobs: jobDescs.length,
        singleJobMode: jobDescs.length === 1,
        message: jobDescs.length === 1 
          ? "Only one job description provided. Add more job descriptions for better multi-job comparison insights."
          : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse multi-job comparison response:', text);
      
      // Fallback: basic comparison
      return NextResponse.json({
        overallAnalysis: {
          bestMatch: 0,
          worstMatch: jobDescs.length - 1,
          averageMatch: 50,
          versatility: jobDescs.length === 1 ? 0 : 50
        },
        jobComparisons: jobDescs.map((_: any, index: number) => ({
          jobIndex: index,
          matchScore: 50,
          strengths: [],
          gaps: [],
          recommendations: []
        })),
        commonThemes: {},
        optimizationStrategy: {},
        insights: {},
        recommendations: [],
        totalJobs: jobDescs.length,
        singleJobMode: jobDescs.length === 1,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Multi-Job Comparison error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to compare resume against multiple jobs",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

