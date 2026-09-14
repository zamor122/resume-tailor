import type { AgentState } from "../state";
import { parseResumeWithLLM } from "@/app/utils/resumeParserLLM";

/**
 * Intake parser node.
 * Deconstructs the raw resume string into an AST containing contact info,
 * sections, experience entries, education, skills, and summary.
 * Uses fast LLM structured extraction by default with a max 3 attempts guard
 * and deterministic fallback on error.
 */
export async function intakeParserNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  try {
    const resumeAST = await parseResumeWithLLM(
      state.rawResume,
      state.modelKey,
      state.sessionApiKeys
    );
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
      logs: [
        `[intakeParser] Resume parsed into AST (${resumeAST.experience.length} jobs, summary: ${resumeAST.summary ? "yes" : "no"})`,
      ],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`[intakeParser] Failed: ${errMsg}`],
    };
  }
}
