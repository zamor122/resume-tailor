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
    
    if (!resume || !jobDescription) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Both resume and job description are required"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the skills gap between a candidate's resume and a job description.
      
      Compare:
      1. Required skills in job description vs skills in resume
      2. Experience level requirements vs actual experience
      3. Education requirements vs actual education
      4. Certifications required vs certifications held
      5. Industry knowledge gaps
      
      Return ONLY a JSON object with this exact format:
      {
        "matchScore": <number 0-100, overall match percentage>,
        "skills": {
          "matched": [
            {
              "skill": "<skill name>",
              "level": "<beginner|intermediate|advanced|expert>",
              "evidence": "<where it appears in resume>"
            }
          ],
          "missing": [
            {
              "skill": "<required skill>",
              "importance": "<critical|high|medium|low>",
              "alternatives": ["<similar skill in resume>", ...],
              "learningPath": "<how to acquire this skill>"
            }
          ],
          "extra": [
            {
              "skill": "<skill in resume but not required>",
              "value": "<how this adds value>"
            }
          ]
        },
        "experience": {
          "required": "<years or level>",
          "actual": "<years or level>",
          "gap": "<difference>",
          "compensatingFactors": ["<factor1>", ...]
        },
        "education": {
          "required": "<degree/qualification>",
          "actual": "<degree/qualification>",
          "meetsRequirement": <boolean>,
          "alternatives": ["<alternative qualifications>"]
        },
        "certifications": {
          "required": ["<cert1>", ...],
          "held": ["<cert1>", ...],
          "missing": ["<cert1>", ...],
          "recommendations": ["<cert1>", ...]
        },
        "actionPlan": [
          {
            "priority": "<high|medium|low>",
            "action": "<what to do>",
            "timeline": "<estimated time>",
            "resources": ["<resource1>", ...]
          }
        ],
        "strengths": ["<strength1>", ...],
        "weaknesses": ["<weakness1>", ...]
      }
      
      Resume:
      ${resume.substring(0, 5000)}
      
      Job Description:
      ${jobDescription.substring(0, 5000)}
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
        matchScore: Math.min(100, Math.max(0, parsedResponse.matchScore || 0)),
        skills: parsedResponse.skills || { matched: [], missing: [], extra: [] },
        experience: parsedResponse.experience || {},
        education: parsedResponse.education || {},
        certifications: parsedResponse.certifications || {},
        actionPlan: parsedResponse.actionPlan || [],
        strengths: parsedResponse.strengths || [],
        weaknesses: parsedResponse.weaknesses || [],
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

