import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, location, industry, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the market value of skills in this resume based on current job market trends.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice like "deepen expertise" or "gain hands-on experience". 
      - Require specific salary ranges (e.g., "$120k-$150k", not "high salary")
      - Provide concrete percentages (e.g., "appears in 67% of job postings", not "common")
      - Include specific learning resources/certifications (exact names, providers, URLs)
      - Calculate ROI for skill development investments (salary increase / time/cost to learn)
      - Provide specific timeframes (e.g., "3-6 months to learn", not "some time")
      - Reference market data (job posting trends, salary surveys)
      
      ${location ? `Location: ${location}\n` : ''}
      ${industry ? `Industry: ${industry}\n` : ''}
      
      Resume:
      ${resume.substring(0, 6000)}
      
      For each skill identified, provide:
      1. Market demand with specific data (percentage of jobs, growth rate)
      2. Salary impact potential with exact ranges
      3. Growth trajectory with specific trends
      4. Competitive advantage with market positioning
      5. Learning recommendations with exact resources
      
      Return ONLY a JSON object:
      {
        "skillsAnalysis": [
          {
            "skill": "<skill name>",
            "category": "<technical|soft|certification|tool>",
            "marketValue": {
              "demand": "<high|medium|low>",
              "demandScore": <number 0-100>,
              "demandPercentage": <exact percentage, e.g., 67, meaning appears in 67% of job postings>,
              "salaryImpact": "<high|medium|low>",
              "salaryRange": "<exact range, e.g., '$120k-$150k' or '+$15k-$25k increase'>",
              "growthTrend": "<rising|stable|declining>",
              "growthRate": <exact percentage growth per year, e.g., 15>,
              "marketShare": <exact percentage of jobs requiring this, e.g., 45>,
              "competition": "<high|medium|low>",
              "competitionLevel": <number 0-100, how competitive>
            },
            "yourLevel": "<beginner|intermediate|advanced|expert>",
            "marketPosition": "<above|at|below market average>",
            "recommendations": {
              "develop": <boolean, should develop further>,
              "highlight": <boolean, should highlight more>,
              "certify": <boolean, should get certified>,
              "nextLevel": "<specific next skill or level to learn, e.g., 'Advanced React patterns' or 'AWS Solutions Architect'>",
              "learningResources": [
                {
                  "type": "<course|certification|book|tutorial>",
                  "name": "<exact resource name>",
                  "provider": "<provider name>",
                  "url": "<URL if available>",
                  "cost": "<exact cost>",
                  "duration": "<exact duration>",
                  "timeToLearn": "<exact time estimate, e.g., '3-6 months'>"
                }
              ],
              "roi": "<return on investment calculation, e.g., 'Learn in 3 months, increase salary by $20k/year = $80k ROI over 4 years'>"
            },
            "opportunities": ["opp1", ...],
            "threats": ["threat1", ...]
          }
        ],
        "marketPositioning": {
          "overallValue": <number 0-100>,
          "competitiveAdvantage": <number 0-100>,
          "marketFit": "<excellent|good|average|poor>",
          "topSkills": ["skill1", ...],
          "underutilizedSkills": ["skill1", ...],
          "missingHighValueSkills": ["skill1", ...]
        },
        "salaryPotential": {
          "currentEstimate": "<exact range, e.g., '$90k-$110k' based on location/industry>",
          "withSkillDevelopment": "<exact range, e.g., '$120k-$150k'>",
          "potentialIncrease": "<exact increase, e.g., '+$20k-$40k per year'>",
          "highValueSkillsToAdd": [
            {
              "skill": "<exact skill name>",
              "salaryIncrease": "<exact increase, e.g., '+$15k-$25k per year'>",
              "timeToLearn": "<exact time, e.g., '3-6 months'>",
              "cost": "<exact cost to learn, e.g., '$500-$2000'>",
              "ROI": "<exact ROI calculation, e.g., 'Invest $1k, gain $20k/year = 20x ROI in first year'>",
              "learningResources": [
                {
                  "type": "<course|certification|book>",
                  "name": "<exact name>",
                  "provider": "<provider>",
                  "url": "<URL>",
                  "cost": "<cost>",
                  "duration": "<duration>"
                }
              ]
            }
          ]
        },
        "careerPath": {
          "currentLevel": "<level>",
          "nextLevel": "<next level>",
          "pathway": ["step1", ...],
          "skillsNeeded": ["skill1", ...],
          "timeline": "<estimated timeline>"
        },
        "trends": {
          "emergingSkills": ["skill1", ...],
          "decliningSkills": ["skill1", ...],
          "stableSkills": ["skill1", ...],
          "industryTrends": ["trend1", ...]
        },
        "recommendations": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action, e.g., 'Get AWS Solutions Architect certification'>",
            "skill": "<exact skill name>",
            "impact": "<specific impact, e.g., 'Increase salary by $20k/year, appear in 40% more job postings'>",
            "effort": "<low|medium|high>",
            "timeline": "<exact timeline, e.g., '3-6 months'>",
            "cost": "<exact cost estimate>",
            "roi": "<exact ROI calculation>",
            "resources": [
              {
                "type": "<course|certification|book>",
                "name": "<exact name>",
                "provider": "<provider>",
                "url": "<URL>",
                "cost": "<cost>"
              }
            ]
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
        skillsAnalysis: parsedResponse.skillsAnalysis || [],
        marketPositioning: parsedResponse.marketPositioning || {},
        salaryPotential: parsedResponse.salaryPotential || {},
        careerPath: parsedResponse.careerPath || {},
        trends: parsedResponse.trends || {},
        recommendations: parsedResponse.recommendations || [],
        location: location || "Not specified",
        industry: industry || "Not specified",
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse skills market value response:', text);
      
      return NextResponse.json({
        skillsAnalysis: [],
        marketPositioning: {
          overallValue: 50,
          competitiveAdvantage: 50,
          marketFit: "average"
        },
        salaryPotential: {},
        careerPath: {},
        trends: {},
        recommendations: [],
        location: location || "Not specified",
        industry: industry || "Not specified",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Skills Market Value error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze skills market value",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

