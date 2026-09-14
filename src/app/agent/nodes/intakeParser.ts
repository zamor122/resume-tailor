import type { AgentState } from "../state";
import { parseResume } from "@/app/utils/resumeParser";
import { parseResumeWithLLM } from "@/app/utils/resumeParserLLM";

/**
 * Intake parser node.
 * Deconstructs the raw resume string into an AST containing contact info,
 * sections, experience entries, education, skills, and summary.
 *
 * Fast Path: Runs the deterministic parser first (<10ms).
 * Gated Fallback: If deterministic parsing yields 0 experience entries,
 * routes to the bounded LLM parser for ambiguous or unstructured resumes.
 */
export async function intakeParserNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  try {
    console.log(`[intakeParser] ▶ Intake parser started (rawResume chars: ${state.rawResume?.length || 0})`);

    // 1. Fast deterministic parse first (<10ms)
    // Runs unless useLLMParser is explicitly requested
    const deterministicAST = !(state as any).useLLMParser
      ? parseResume(state.rawResume)
      : { experience: [], sections: [], contactInfo: {}, education: [], skills: { technical: [], soft: [] }, summary: null };

    if (deterministicAST.experience.length > 0) {
      console.log(`[intakeParser] ✔ Fast deterministic parser succeeded: ${deterministicAST.experience.length} jobs, summary: ${deterministicAST.summary ? "present" : "none"}, sections: ${deterministicAST.sections.join(", ")}`);
      return {
        resumeAST: {
          contactInfo: deterministicAST.contactInfo,
          education: deterministicAST.education,
          experience: deterministicAST.experience,
          sections: deterministicAST.sections,
          skills: {
            technical: deterministicAST.skills?.technical || [],
            soft: deterministicAST.skills?.soft || [],
          },
          summary: deterministicAST.summary,
        },
        logs: [
          `[intakeParser] Resume parsed into AST (${deterministicAST.experience.length} jobs, summary: ${deterministicAST.summary ? "yes" : "no"})`,
        ],
      };
    }

    // 2. Gated Fallback: If deterministic parsing could not extract experience, use bounded LLM parser
    console.log(`[intakeParser] ⚡ Deterministic parser found 0 jobs; gating to LLM resume parser...`);
    const resumeAST = await parseResumeWithLLM(
      state.rawResume,
      state.modelKey,
      state.sessionApiKeys,
      1 // 1 bounded attempt to preserve pipeline timeout budget
    );
    console.log(`[intakeParser] ✔ LLM parser generated: ${resumeAST.experience.length} jobs, summary: ${resumeAST.summary ? "present" : "none"}, sections: ${resumeAST.sections.join(", ")}`);
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
