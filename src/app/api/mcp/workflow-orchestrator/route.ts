import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 120; // Longer for orchestration

interface ToolExecution {
  toolId: string;
  endpoint: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  executionTime?: number;
}

interface WorkflowResult {
  workflowId: string;
  workflowType: string;
  status: "completed" | "partial" | "failed";
  executions: ToolExecution[];
  aggregatedResult: any;
  totalTime: number;
}

// Available tools mapping
const availableTools = {
  "ats-simulator": "/api/tools/ats-simulator",
  "ats-optimizer": "/api/tools/ats-optimizer",
  "keyword-analyzer": "/api/tools/keyword-analyzer",
  "skills-gap": "/api/tools/skills-gap",
  "interview-prep": "/api/tools/interview-prep",
  "format-validator": "/api/tools/format-validator",
  "resume-storyteller": "/api/tools/resume-storyteller",
  "multi-job-comparison": "/api/tools/multi-job-comparison",
  "skills-market-value": "/api/tools/skills-market-value",
  "ai-detection": "/api/ai-detection",
  "relevancy": "/api/relevancy",
};

// Tool dependencies
const toolDependencies: Record<string, string[]> = {
  "ats-optimizer": ["ats-simulator"], // Need ATS score first
  "skills-gap": ["keyword-analyzer"], // Need keywords first
  "multi-job-comparison": ["relevancy"], // Need relevancy calculation
};

// Workflow definitions
const workflows = {
  "resume-analysis": {
    tools: ["format-validator", "ats-simulator", "ai-detection"],
    description: "Comprehensive resume analysis"
  },
  "job-matching": {
    tools: ["keyword-analyzer", "skills-gap", "relevancy"],
    description: "Match resume to job description"
  },
  "optimization": {
    tools: ["ats-simulator", "ats-optimizer", "keyword-analyzer", "format-validator"],
    description: "Optimize resume for ATS"
  },
  "comparison": {
    tools: ["relevancy", "skills-gap", "ai-detection"],
    description: "Compare original vs tailored resume"
  },
  "full-analysis": {
    tools: ["format-validator", "ats-simulator", "keyword-analyzer", "skills-gap", "relevancy", "ai-detection"],
    description: "Complete analysis workflow"
  }
};

export async function POST(req: NextRequest) {
  try {
    const { workflowType, context, tools, resume, jobDescription } = await req.json();
    
    const startTime = Date.now();
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine which tools to run
    let toolsToRun: string[] = [];
    
    if (workflowType && workflows[workflowType as keyof typeof workflows]) {
      toolsToRun = workflows[workflowType as keyof typeof workflows].tools;
    } else if (tools && Array.isArray(tools)) {
      toolsToRun = tools;
    } else {
      // Auto-detect workflow based on context
      if (resume && jobDescription) {
        toolsToRun = workflows["job-matching"].tools;
      } else if (resume) {
        toolsToRun = workflows["resume-analysis"].tools;
      } else {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Cannot determine workflow without resume or job description"
        }, { status: 400 });
      }
    }

    // Resolve dependencies
    const resolvedTools: string[] = [];
    const addWithDependencies = (toolId: string) => {
      const deps = toolDependencies[toolId] || [];
      deps.forEach(dep => {
        if (!resolvedTools.includes(dep)) {
          addWithDependencies(dep);
        }
      });
      if (!resolvedTools.includes(toolId)) {
        resolvedTools.push(toolId);
      }
    };

    toolsToRun.forEach(tool => addWithDependencies(tool));

    // Execute tools
    const executions: ToolExecution[] = resolvedTools.map(toolId => ({
      toolId,
      endpoint: availableTools[toolId as keyof typeof availableTools] || "",
      status: "pending" as const
    }));

    const results: Record<string, any> = {};
    let hasErrors = false;

    // Execute tools sequentially (can be parallelized later)
    for (const execution of executions) {
      if (!execution.endpoint) {
        execution.status = "failed";
        execution.error = `Tool ${execution.toolId} not found`;
        hasErrors = true;
        continue;
      }

      execution.status = "running";
      const toolStartTime = Date.now();

      try {
        // Prepare request body based on tool
        let body: any = {};
        
        if (execution.toolId === "ats-simulator" || execution.toolId === "ats-optimizer" || 
            execution.toolId === "format-validator" || execution.toolId === "resume-storyteller" ||
            execution.toolId === "skills-market-value") {
          body = { resume: resume || context?.resume };
        } else if (execution.toolId === "keyword-analyzer") {
          body = { jobDescription: jobDescription || context?.jobDescription };
        } else if (execution.toolId === "skills-gap" || execution.toolId === "relevancy" ||
                   execution.toolId === "interview-prep") {
          body = {
            resume: resume || context?.resume,
            jobDescription: jobDescription || context?.jobDescription
          };
        } else if (execution.toolId === "ai-detection") {
          body = { text: resume || context?.resume };
        }

        // Use previous results if available
        if (execution.toolId === "ats-optimizer" && results["ats-simulator"]) {
          body.currentScore = results["ats-simulator"].atsScore;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${execution.endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`Tool ${execution.toolId} failed: ${response.statusText}`);
        }

        execution.result = await response.json();
        execution.status = "completed";
        execution.executionTime = Date.now() - toolStartTime;
        results[execution.toolId] = execution.result;
      } catch (error) {
        execution.status = "failed";
        execution.error = error instanceof Error ? error.message : "Unknown error";
        execution.executionTime = Date.now() - toolStartTime;
        hasErrors = true;
      }
    }

    // Aggregate results
    const aggregatedResult = {
      resume: resume || context?.resume ? {
        length: (resume || context?.resume).length,
        atsScore: results["ats-simulator"]?.atsScore,
        aiScore: results["ai-detection"]?.aiScore,
        formatValid: results["format-validator"]?.atsCompatible
      } : null,
      jobDescription: jobDescription || context?.jobDescription ? {
        length: (jobDescription || context?.jobDescription).length,
        keywords: results["keyword-analyzer"]?.keywords,
        requirements: results["keyword-analyzer"]?.keywords?.technical?.length || 0
      } : null,
      matching: {
        relevancyScore: results["relevancy"]?.after || results["relevancy"]?.before,
        skillsGap: results["skills-gap"]?.matchScore,
        missingSkills: results["skills-gap"]?.skills?.missing?.length || 0
      },
      optimization: {
        currentScore: results["ats-optimizer"]?.currentScore,
        projectedScore: results["ats-optimizer"]?.projectedScore,
        improvements: results["ats-optimizer"]?.quickWins?.length || 0
      },
      tools: results
    };

    const workflowResult: WorkflowResult = {
      workflowId,
      workflowType: workflowType || "auto-detected",
      status: hasErrors ? (executions.some(e => e.status === "completed") ? "partial" : "failed") : "completed",
      executions,
      aggregatedResult,
      totalTime: Date.now() - startTime
    };

    return NextResponse.json(workflowResult);

  } catch (error) {
    console.error('Workflow Orchestrator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to orchestrate workflow",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

