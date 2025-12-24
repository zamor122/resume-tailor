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
    const { resume, location, industry } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the market value of skills in this resume based on current job market trends.
      
      ${location ? `Location: ${location}\n` : ''}
      ${industry ? `Industry: ${industry}\n` : ''}
      
      Resume:
      ${resume.substring(0, 6000)}
      
      For each skill identified, provide:
      1. Market demand (high/medium/low)
      2. Salary impact potential
      3. Growth trajectory
      4. Competitive advantage
      5. Learning recommendations
      
      Return ONLY a JSON object:
      {
        "skillsAnalysis": [
          {
            "skill": "<skill name>",
            "category": "<technical|soft|certification|tool>",
            "marketValue": {
              "demand": "<high|medium|low>",
              "demandScore": <number 0-100>,
              "salaryImpact": "<high|medium|low>",
              "growthTrend": "<rising|stable|declining>",
              "marketShare": "<percentage of jobs requiring this>",
              "competition": "<high|medium|low>"
            },
            "yourLevel": "<beginner|intermediate|advanced|expert>",
            "marketPosition": "<above|at|below market average>",
            "recommendations": {
              "develop": <boolean, should develop further>,
              "highlight": <boolean, should highlight more>,
              "certify": <boolean, should get certified>,
              "nextLevel": "<what to learn next>"
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
          "currentEstimate": "<range>",
          "withSkillDevelopment": "<range>",
          "highValueSkillsToAdd": [
            {
              "skill": "<skill>",
              "salaryIncrease": "<estimated increase>",
              "timeToLearn": "<estimated time>",
              "ROI": "<return on investment>"
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
            "priority": "<high|medium|low>",
            "action": "<action>",
            "skill": "<skill name>",
            "impact": "<expected impact>",
            "effort": "<low|medium|high>",
            "timeline": "<timeline>"
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

