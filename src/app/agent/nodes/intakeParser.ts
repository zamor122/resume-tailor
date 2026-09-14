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
    console.log(`[intakeParser] ▶ Intake parser started (rawResume chars: ${state.rawResume?.length || 0})`);
    const resumeAST = await parseResumeWithLLM(
      state.rawResume,
      state.modelKey,
      state.sessionApiKeys
    );
    console.log(`[intakeParser] ✔ AST successfully generated: ${resumeAST.experience.length} jobs, summary: ${resumeAST.summary ? "present" : "none"}, sections: ${resumeAST.sections.join(", ")}`);
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
    console.error(`[intakeParser] ❌ Failed: ${errMsg}`);
    return {
      errors: [`[intakeParser] Failed: ${errMsg}`],
    };
  }
}
