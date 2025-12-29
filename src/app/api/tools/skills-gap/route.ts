import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, sessionId, modelKey } = await req.json();
    
    if (!resume || !jobDescription) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Both resume and job description are required"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the skills gap between a candidate's resume and a job description.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact percentages, timeframes, and concrete learning resources.
      - Require specific skill gap percentages (e.g., "67% match", not "good match")
      - Provide exact learning resources (course names, certification names, book titles, URLs)
      - Include time estimates to acquire each skill (e.g., "3-6 months", "2 weeks")
      - Calculate match score breakdown by category with percentages
      - Provide specific evidence from resume for matched skills
      
      Compare:
      1. Required skills in job description vs skills in resume
      2. Experience level requirements vs actual experience
      3. Education requirements vs actual education
      4. Certifications required vs certifications held
      5. Industry knowledge gaps
      
      Return ONLY a JSON object with this exact format:
      {
        "matchScore": <number 0-100, overall match percentage>,
        "matchBreakdown": {
          "skills": <number 0-100, skills match %>,
          "experience": <number 0-100, experience match %>,
          "education": <number 0-100, education match %>,
          "certifications": <number 0-100, certifications match %>
        },
        "skills": {
          "matched": [
            {
              "skill": "<exact skill name>",
              "level": "<beginner|intermediate|advanced|expert>",
              "matchConfidence": <number 0-100>,
              "evidence": "<exact text from resume showing this skill>",
              "section": "<section where found>"
            }
          ],
          "missing": [
            {
              "skill": "<exact required skill>",
              "importance": "<critical|high|medium|low>",
              "importanceScore": <number 0-100>,
              "alternatives": [
                {
                  "skill": "<similar skill in resume>",
                  "relevance": <number 0-100, how relevant as alternative>
                }
              ],
              "learningPath": {
                "timeEstimate": "<exact time, e.g., '3-6 months', '2 weeks'>",
                "resources": [
                  {
                    "type": "<course|certification|book|tutorial>",
                    "name": "<exact name>",
                    "provider": "<provider name>",
                    "url": "<URL if available>",
                    "cost": "<cost estimate>",
                    "duration": "<duration>"
                  }
                ],
                "steps": ["<step1>", "<step2>", ...]
              }
            }
          ],
          "extra": [
            {
              "skill": "<skill in resume but not required>",
              "value": "<specific value: how this adds value to application>",
              "highlight": <boolean, should highlight this>
            }
          ]
        },
        "experience": {
          "required": "<exact years or level (e.g., '5+ years', 'Senior level')>",
          "actual": "<exact years or level from resume>",
          "gap": "<exact difference, e.g., '-2 years', '+1 year'>",
          "matchPercentage": <number 0-100>,
          "compensatingFactors": [
            {
              "factor": "<specific factor>",
              "impact": "<how this compensates>",
              "evidence": "<evidence from resume>"
            }
          ]
        },
        "education": {
          "required": "<exact degree/qualification>",
          "actual": "<exact degree/qualification from resume>",
          "meetsRequirement": <boolean>,
          "matchPercentage": <number 0-100>,
          "alternatives": [
            {
              "qualification": "<alternative>",
              "relevance": <number 0-100>
            }
          ]
        },
        "certifications": {
          "required": [
            {
              "cert": "<exact certification name>",
              "importance": "<critical|high|medium|low>"
            }
          ],
          "held": ["<exact cert1>", ...],
          "missing": [
            {
              "cert": "<exact certification name>",
              "importance": "<critical|high|medium|low>",
              "timeToObtain": "<time estimate>",
              "cost": "<cost estimate>",
              "provider": "<certification provider>"
            }
          ],
          "recommendations": [
            {
              "cert": "<certification name>",
              "priority": "<high|medium|low>",
              "reason": "<why recommended>",
              "timeToObtain": "<time estimate>",
              "cost": "<cost estimate>"
            }
          ]
        },
        "actionPlan": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action to take>",
            "skill": "<skill or area>",
            "timeline": "<exact timeline, e.g., '2 weeks', '3-6 months'>",
            "resources": [
              {
                "type": "<course|certification|book|tutorial>",
                "name": "<exact resource name>",
                "provider": "<provider>",
                "url": "<URL>",
                "cost": "<cost>",
                "duration": "<duration>"
              }
            ],
            "expectedImpact": "<how this improves match score>"
          }
        ],
        "strengths": [
          {
            "strength": "<specific strength>",
            "evidence": "<evidence from resume>",
            "impact": "<how this helps application>"
          }
        ],
        "weaknesses": [
          {
            "weakness": "<specific weakness>",
            "impact": "<how this hurts application>",
            "mitigation": "<how to address>"
          }
        ],
        "estimatedTimeToCloseGaps": "<total time estimate to close all critical gaps>"
      }
      
      Resume:
      ${resume.substring(0, 5000)}
      
      Job Description:
      ${jobDescription.substring(0, 5000)}
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
        matchScore: Math.min(100, Math.max(0, parsedResponse.matchScore || 0)),
        matchBreakdown: parsedResponse.matchBreakdown || {},
        skills: parsedResponse.skills || { matched: [], missing: [], extra: [] },
        experience: parsedResponse.experience || {},
        education: parsedResponse.education || {},
        certifications: parsedResponse.certifications || {},
        actionPlan: parsedResponse.actionPlan || [],
        strengths: parsedResponse.strengths || [],
        weaknesses: parsedResponse.weaknesses || [],
        estimatedTimeToCloseGaps: parsedResponse.estimatedTimeToCloseGaps || "Unknown",
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse skills gap response:', text);
      
      return NextResponse.json({
        matchScore: 50,
        skills: { matched: [], missing: [], extra: [] },
        experience: {},
        education: {},
        certifications: {},
        actionPlan: [],
        strengths: [],
        weaknesses: [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Skills Gap Analyzer error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze skills gap",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

