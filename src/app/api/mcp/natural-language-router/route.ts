import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { isRateLimitError } from "@/app/services/ai-provider";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

interface AvailableTool {
  id: string;
  name: string;
  description: string;
  requires: string[];
  endpoint: string;
}

const availableTools: Record<string, AvailableTool> = {
  "ats-simulator": {
    id: "ats-simulator",
    name: "ATS Simulator",
    description: "Simulates how an ATS system would parse and score your resume",
    requires: ["resume"],
    endpoint: "/api/tools/ats-simulator"
  },
  "keyword-analyzer": {
    id: "keyword-analyzer",
    name: "Keyword Analyzer",
    description: "Analyzes job description to extract key skills, qualifications, and keywords",
    requires: ["jobDescription"],
    endpoint: "/api/tools/keyword-analyzer"
  },
  "skills-gap": {
    id: "skills-gap",
    name: "Skills Gap Analyzer",
    description: "Identifies missing skills in your resume compared to job requirements",
    requires: ["resume", "jobDescription"],
    endpoint: "/api/tools/skills-gap"
  },
  "interview-prep": {
    id: "interview-prep",
    name: "Interview Prep Generator",
    description: "Generates interview questions and preparation tips based on your resume and job description",
    requires: ["resume", "jobDescription"],
    endpoint: "/api/tools/interview-prep"
  },
  "format-validator": {
    id: "format-validator",
    name: "Format Validator",
    description: "Validates resume format for ATS compatibility",
    requires: ["resume"],
    endpoint: "/api/tools/format-validator"
  },
  "resume-versions": {
    id: "resume-versions",
    name: "Resume Version Control",
    description: "Manages and compares different versions of your resume",
    requires: ["resume"],
    endpoint: "/api/tools/resume-versions"
  },
  "ats-optimizer": {
    id: "ats-optimizer",
    name: "ATS Score Optimizer",
    description: "Provides recommendations to improve ATS compatibility score",
    requires: ["resume"],
    endpoint: "/api/tools/ats-optimizer"
  },
  "resume-storyteller": {
    id: "resume-storyteller",
    name: "Resume Storyteller",
    description: "Helps craft compelling narratives and stories from your resume",
    requires: ["resume"],
    endpoint: "/api/tools/resume-storyteller"
  },
  "multi-job-comparison": {
    id: "multi-job-comparison",
    name: "Multi-Job Comparison",
    description: "Compares your resume against multiple job descriptions simultaneously",
    requires: ["resume", "jobDescription"],
    endpoint: "/api/tools/multi-job-comparison"
  },
  "skills-market-value": {
    id: "skills-market-value",
    name: "Skills Market Value Analyzer",
    description: "Analyzes the market value and demand for skills in your resume",
    requires: ["resume"],
    endpoint: "/api/tools/skills-market-value"
  }
};

export async function POST(req: NextRequest) {
  try {
    const { userQuery, context, sessionId, modelKey } = await req.json();
    
    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json({
        error: "Invalid Input",
        message: "userQuery is required"
      }, { status: 400 });
    }

    const hasResume = context?.hasResume || false;
    const hasJobDescription = context?.hasJobDescription || false;
    const hasTailoredResume = context?.hasTailoredResume || false;

    // Build available tools list based on context
    const toolsList = Object.values(availableTools)
      .filter(tool => {
        if (tool.requires.includes("resume") && !hasResume) return false;
        if (tool.requires.includes("jobDescription") && !hasJobDescription) return false;
        return true;
      })
      .map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        requires: tool.requires
      }));

    const prompt = `You are an intelligent tool router. Analyze the user's natural language query and determine which tool(s) they want to use.

User Query: "${userQuery}"

Available Context:
- Has Resume: ${hasResume}
- Has Job Description: ${hasJobDescription}
- Has Tailored Resume: ${hasTailoredResume}

Available Tools:
${toolsList.map(t => `- ${t.id}: ${t.name} - ${t.description} (requires: ${t.requires.join(', ')})`).join('\n')}

Analyze the user's intent and return ONLY a JSON object with this structure:
{
  "selectedTools": ["tool-id-1", "tool-id-2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of why these tools were selected",
  "missingRequirements": ["resume"] // if any required data is missing
}

If the user's query doesn't match any tool, return:
{
  "selectedTools": [],
  "confidence": 0.0,
  "reasoning": "Query doesn't match any available tools",
  "missingRequirements": []
}

Examples:
- "check my resume format" → ["format-validator"]
- "what keywords should I use" → ["keyword-analyzer"]
- "what skills am I missing" → ["skills-gap"]
- "help me prepare for interviews" → ["interview-prep"]
- "how does my resume score" → ["ats-simulator"]
- "compare my resume to multiple jobs" → ["multi-job-comparison"]

Return ONLY the JSON, no other text.`;

    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    try {
      const result = await generateWithFallback(
        prompt,
        selectedModel,
        undefined,
        sessionApiKeys
      );
      const textResponse = result.text.trim();
      
      // Extract JSON from response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and enrich response
      const selectedTools = (parsed.selectedTools || []).filter((toolId: string) => 
        availableTools[toolId]
      ).map((toolId: string) => ({
        ...availableTools[toolId],
        confidence: parsed.confidence || 0.5
      }));

      return NextResponse.json({
        selectedTools,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || "Tool selection completed",
        missingRequirements: parsed.missingRequirements || [],
        query: userQuery
      });
    } catch (apiError: any) {
      // Handle quota/rate limit errors
      if (isRateLimitError(apiError)) {
        console.warn('API quota exceeded for natural language router. Using fallback.');
        
        // Fallback: simple keyword matching
        const lowerQuery = userQuery.toLowerCase();
        const selectedTools: any[] = [];
        
        if (lowerQuery.includes("ats") || lowerQuery.includes("score") || lowerQuery.includes("compatibility")) {
          if (hasResume) selectedTools.push(availableTools["ats-simulator"]);
        }
        if (lowerQuery.includes("keyword") || lowerQuery.includes("skills") && lowerQuery.includes("job")) {
          if (hasJobDescription) selectedTools.push(availableTools["keyword-analyzer"]);
        }
        if (lowerQuery.includes("gap") || lowerQuery.includes("missing")) {
          if (hasResume && hasJobDescription) selectedTools.push(availableTools["skills-gap"]);
        }
        if (lowerQuery.includes("interview") || lowerQuery.includes("prepare")) {
          if (hasResume && hasJobDescription) selectedTools.push(availableTools["interview-prep"]);
        }
        if (lowerQuery.includes("format") || lowerQuery.includes("valid")) {
          if (hasResume) selectedTools.push(availableTools["format-validator"]);
        }
        
        return NextResponse.json({
          selectedTools: selectedTools.map(tool => ({ ...tool, confidence: 0.6 })),
          confidence: 0.6,
          reasoning: "Fallback keyword matching (API quota exceeded)",
          missingRequirements: [],
          query: userQuery,
          quotaExceeded: true
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Natural language router error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to route query",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

