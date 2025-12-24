import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 90; // Longer for multiple jobs

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescriptions, jobDescription } = await req.json();
    
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
            "jobTitle": "<title>",
            "matchScore": <number 0-100>,
            "strengths": ["strength1", ...],
            "gaps": ["gap1", ...],
            "uniqueRequirements": ["req1", ...],
            "commonRequirements": ["req1", ...],
            "recommendations": ["rec1", ...]
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
              "action": "<action>",
              "impact": "<impact on all jobs>",
              "priority": "<high|medium|low>"
            }
          ],
          "jobSpecificOptimizations": [
            {
              "jobIndex": <number>,
              "optimizations": ["opt1", ...],
              "expectedImprovement": <score increase>
            }
          ],
          "resumeVersions": [
            {
              "version": "<version name>",
              "targetJobs": [<job indices>],
              "keyChanges": ["change1", ...],
              "expectedMatch": <average score>
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

