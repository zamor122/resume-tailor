/**
 * Pipeline definitions for Smart Pipelines feature.
 * Each pipeline defines a sequence of steps; internal steps (tailor) map to humanize stream.
 */

export type PipelineId = "apply_to_job" | "check_resume" | "prepare_interview" | "full_optimization";

export interface PipelineStep {
  id: string;
  label: string;
  /** API endpoint for /api/tools/* or /api/mcp-tools/* */
  endpoint?: string;
  /** Internal step handled by humanize stream (tailor) */
  internalStep?: "tailor";
}

export interface PipelineConfig {
  id: PipelineId;
  name: string;
  description: string;
  icon: string;
  requiresResume: boolean;
  requiresJobDescription: boolean;
  steps: PipelineStep[];
}

export const INTENT_PIPELINES: Record<PipelineId, PipelineConfig> = {
  apply_to_job: {
    id: "apply_to_job",
    name: "Apply to Job",
    description: "Full tailor, validation, and job match optimization",
    icon: "📤",
    requiresResume: true,
    requiresJobDescription: true,
    steps: [
      { id: "tailor", label: "Tailoring resume", internalStep: "tailor" },
    ],
  },
  check_resume: {
    id: "check_resume",
    name: "Check Resume",
    description: "Validate formatting and structure",
    icon: "✅",
    requiresResume: true,
    requiresJobDescription: false,
    steps: [
      { id: "resume_validator", label: "Validating content", endpoint: "/api/mcp-tools/resume-validator" },
      { id: "format_validator", label: "Checking format", endpoint: "/api/tools/format-validator" },
      { id: "ats_simulator", label: "Checking parse & readability", endpoint: "/api/tools/ats-simulator" },
    ],
  },
  prepare_interview: {
    id: "prepare_interview",
    name: "Prepare Interview",
    description: "Skills gap analysis and interview questions",
    icon: "💼",
    requiresResume: true,
    requiresJobDescription: true,
    steps: [
      { id: "skills_gap", label: "Analyzing skills gap", endpoint: "/api/tools/skills-gap" },
      { id: "interview_prep", label: "Generating interview prep", endpoint: "/api/tools/interview-prep" },
    ],
  },
  full_optimization: {
    id: "full_optimization",
    name: "Full Optimization",
    description: "Format check, skills gap, tailor, validate, interview prep",
    icon: "🚀",
    requiresResume: true,
    requiresJobDescription: true,
    steps: [
      { id: "ats_simulator", label: "Checking parse & readability", endpoint: "/api/tools/ats-simulator" },
      { id: "skills_gap", label: "Analyzing skills gap", endpoint: "/api/tools/skills-gap" },
      { id: "tailor", label: "Tailoring resume", internalStep: "tailor" },
      { id: "resume_validator", label: "Validating content", endpoint: "/api/mcp-tools/resume-validator" },
      { id: "interview_prep", label: "Generating interview prep", endpoint: "/api/tools/interview-prep" },
    ],
  },
};

export function getPipeline(id: PipelineId): PipelineConfig {
  const config = INTENT_PIPELINES[id];
  if (!config) throw new Error(`Unknown pipeline: ${id}`);
  return config;
}
