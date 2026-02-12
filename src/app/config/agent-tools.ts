/**
 * Agent tool schema for LLM planning loop.
 * Maps tool IDs to API endpoints and requirements.
 */

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  requiresResume: boolean;
  requiresJobDescription: boolean;
  endpoint: string;
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    id: "keyword_extractor",
    name: "Keyword Extractor",
    description: "Extract keywords from job description",
    requiresResume: false,
    requiresJobDescription: true,
    endpoint: "/api/mcp-tools/keyword-extractor",
  },
  {
    id: "skills_gap",
    name: "Skills Gap Analyzer",
    description: "Compare resume skills vs job requirements",
    requiresResume: true,
    requiresJobDescription: true,
    endpoint: "/api/tools/skills-gap",
  },
  {
    id: "tailor",
    name: "Resume Tailor",
    description: "Tailor resume to job description using AI",
    requiresResume: true,
    requiresJobDescription: true,
    endpoint: "/api/humanize/stream",
  },
  {
    id: "resume_validator",
    name: "Resume Validator",
    description: "Validate content and check for fabrication",
    requiresResume: true,
    requiresJobDescription: false,
    endpoint: "/api/mcp-tools/resume-validator",
  },
  {
    id: "interview_prep",
    name: "Interview Prep",
    description: "Generate interview questions and prep materials",
    requiresResume: true,
    requiresJobDescription: true,
    endpoint: "/api/tools/interview-prep",
  },
  {
    id: "format_validator",
    name: "Format Validator",
    description: "Check ATS-friendly formatting",
    requiresResume: true,
    requiresJobDescription: false,
    endpoint: "/api/tools/format-validator",
  },
  {
    id: "ats_simulator",
    name: "ATS Simulator",
    description: "Simulate how ATS systems parse resume",
    requiresResume: true,
    requiresJobDescription: false,
    endpoint: "/api/tools/ats-simulator",
  },
  {
    id: "resume_parser",
    name: "Resume Parser",
    description: "Parse resume structure and sections",
    requiresResume: true,
    requiresJobDescription: false,
    endpoint: "/api/mcp-tools/resume-parser",
  },
  {
    id: "company_research",
    name: "Company Research",
    description: "Research company from job description",
    requiresResume: false,
    requiresJobDescription: true,
    endpoint: "/api/mcp-tools/company-research",
  },
];

export function getAgentTool(id: string): AgentTool | undefined {
  return AGENT_TOOLS.find((t) => t.id === id);
}

export function getToolIdsForPlan(): string[] {
  return AGENT_TOOLS.map((t) => t.id);
}
