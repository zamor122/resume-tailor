import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resume, sessionId, modelKey } = await req.json();
    
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Job description is required"
      }, { status: 400 });
    }

    const prompt = `
      Generate comprehensive interview preparation materials based on a job description and candidate resume.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include complete examples from the candidate's resume.
      - Require specific examples from candidate's resume (exact achievements, projects, experiences)
      - Provide complete STAR responses, not just frameworks (full Situation, Task, Action, Result)
      - Include difficulty ratings and specific answer approaches
      - Reference specific resume achievements with exact details
      - Provide concrete talking points with evidence from resume
      
      ${resume ? `Candidate Resume:\n${resume.substring(0, 3000)}\n\n` : ''}
      
      Create:
      1. Behavioral interview questions (STAR method) - with complete example responses
      2. Technical interview questions (if applicable) - with answer approaches
      3. Situational questions - with specific scenarios
      4. Questions to ask the interviewer - tailored to this role
      5. Key talking points from resume - with exact evidence
      6. Potential red flags to address - with specific mitigation strategies
      
      Return ONLY a JSON object with this exact format:
      {
        "behavioral": [
          {
            "question": "<exact question>",
            "why": "<specific reason why they might ask this based on job description>",
            "starFramework": {
              "situation": "<complete situation from candidate's resume with specific details>",
              "task": "<specific task or challenge from candidate's experience>",
              "action": "<exact actions candidate took from their resume>",
              "result": "<specific, quantifiable results from candidate's resume>"
            },
            "completeExample": "<full STAR response using candidate's actual experience>",
            "tips": ["<specific tip1>", ...],
            "keywords": ["<keywords to include>", ...]
          }
        ],
        "technical": [
          {
            "question": "<exact technical question>",
            "category": "<exact category, e.g., 'System Design', 'Algorithms', 'Database'>",
            "difficulty": "<easy|medium|hard>",
            "answer": "<specific answer approach with steps>",
            "answerFramework": "<structured approach to answer>",
            "resources": [
              {
                "type": "<article|video|course|book>",
                "name": "<exact resource name>",
                "url": "<URL if available>"
              }
            ],
            "relatedToResume": <boolean, if relates to candidate's experience>,
            "resumeConnection": "<how to connect to candidate's experience>"
          }
        ],
        "situational": [
          {
            "question": "<exact situational question>",
            "scenario": "<specific scenario description>",
            "approach": "<specific approach with steps>",
            "exampleFromResume": "<similar situation from candidate's resume if applicable>",
            "keyPoints": ["<point1>", ...]
          }
        ],
        "questionsToAsk": [
          {
            "question": "<exact question to ask>",
            "category": "<culture|role|growth|team|compensation>",
            "why": "<specific reason why this is a good question for this role>",
            "followUp": "<potential follow-up question>"
          }
        ],
        "talkingPoints": [
          {
            "point": "<specific talking point>",
            "evidence": "<exact evidence from resume with details>",
            "impact": "<specific way to present this with numbers/metrics>",
            "whenToUse": "<when in interview to bring this up>"
          }
        ],
        "redFlags": [
          {
            "issue": "<specific potential concern>",
            "evidence": "<what in resume might raise this concern>",
            "howToAddress": "<specific strategy to address it>",
            "positiveSpin": "<exact positive way to frame>",
            "preparation": "<how to prepare for this question>"
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

