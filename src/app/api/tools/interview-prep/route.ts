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
    const { jobDescription, resume } = await req.json();
    
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Job description is required"
      }, { status: 400 });
    }

    const prompt = `
      Generate comprehensive interview preparation materials based on a job description and candidate resume.
      
      Create:
      1. Behavioral interview questions (STAR method)
      2. Technical interview questions (if applicable)
      3. Situational questions
      4. Questions to ask the interviewer
      5. Key talking points from resume
      6. Potential red flags to address
      
      ${resume ? `Candidate Resume:\n${resume.substring(0, 3000)}\n\n` : ''}
      
      Return ONLY a JSON object with this exact format:
      {
        "behavioral": [
          {
            "question": "<question>",
            "why": "<why they might ask this>",
            "starFramework": {
              "situation": "<example situation>",
              "task": "<example task>",
              "action": "<example action>",
              "result": "<example result>"
            },
            "tips": ["<tip1>", ...]
          }
        ],
        "technical": [
          {
            "question": "<question>",
            "category": "<category>",
            "difficulty": "<easy|medium|hard>",
            "answer": "<suggested answer approach>",
            "resources": ["<resource1>", ...]
          }
        ],
        "situational": [
          {
            "question": "<question>",
            "scenario": "<scenario description>",
            "approach": "<how to answer>"
          }
        ],
        "questionsToAsk": [
          {
            "question": "<question>",
            "category": "<culture|role|growth|team>",
            "why": "<why this is a good question>"
          }
        ],
        "talkingPoints": [
          {
            "point": "<talking point>",
            "evidence": "<evidence from resume>",
            "impact": "<how to present this>"
          }
        ],
        "redFlags": [
          {
            "issue": "<potential concern>",
            "howToAddress": "<how to address it>",
            "positiveSpin": "<positive way to frame>"
          }
        ],
        "interviewTips": [
          "<tip1>",
          "<tip2>",
          ...
        ]
      }
      
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
        behavioral: parsedResponse.behavioral || [],
        technical: parsedResponse.technical || [],
        situational: parsedResponse.situational || [],
        questionsToAsk: parsedResponse.questionsToAsk || [],
        talkingPoints: parsedResponse.talkingPoints || [],
        redFlags: parsedResponse.redFlags || [],
        interviewTips: parsedResponse.interviewTips || [],
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse interview prep response:', text);
      
      return NextResponse.json({
        behavioral: [],
        technical: [],
        situational: [],
        questionsToAsk: [],
        talkingPoints: [],
        redFlags: [],
        interviewTips: ["Prepare examples using the STAR method", "Research the company thoroughly"],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Interview Prep Generator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to generate interview prep",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

