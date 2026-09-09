import type { AgentState } from "../state";
import { parseResume } from "@/app/utils/resumeParser";

/**
 * Deterministic intake parser node.
 * Breaks the raw resume string into an AST containing contact info,
 * sections, experience entries, education, skills, and summary.
 * Zero LLM calls, < 15ms execution.
 */
export async function intakeParserNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  try {
    const resumeAST = parseResume(state.rawResume);
    return {
      resumeAST: {
        contactInfo: resumeAST.contactInfo,
        education: resumeAST.education,
        experience: resumeAST.experience,
        sections: resumeAST.sections,
        skills: {
          technical: resumeAST.skills?.technical || [],
          soft: resumeAST.skills?.soft || [],
        },
        summary: resumeAST.summary,
      },
      logs: ["[intakeParser] Resume parsed into AST"],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`[intakeParser] Failed: ${errMsg}`],
    };
  }
}
