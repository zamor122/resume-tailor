import type { AgentState } from "../state";
import { parseResume } from "@/app/utils/resumeParser";
import { parseResumeWithLLM } from "@/app/utils/resumeParserLLM";
import { resolveStepModel } from "@/app/runtime/cost-guard";

/**
 * Intake parser node.
 * Deconstructs the raw resume string into an AST containing contact info,
 * sections, experience entries, education, skills, and summary.
 *
 * Fast Path: Runs the deterministic parser first (<10ms).
 * Gated Fallback: If deterministic parsing yields 0 experience entries,
 * routes to the bounded LLM parser for ambiguous or unstructured resumes.
 */
/**
 * Repairs common PDF text-extraction ligature splits (e.g. "fi nancial" -> "financial",
 * "sta ff" -> "staff", "pro fi le" -> "profile") without touching normal prose.
 */
function repairPdfLigatures(text: string): string {
  if (!text) return text;
  return text
    .replace(/\b(fi|fl)\s+([a-z]{2,})/g, "$1$2")
    .replace(/([a-z]{2,})\s+(ff|fi|fl)\b/g, "$1$2")
    .replace(/([a-z]{2,})\s+(ffi|ffl|fi|fl)\s+([a-z]{2,})/g, "$1$2$3");
}

function isSuspiciousSingleJobParse(
  experience: Array<{ company?: string; description?: string }>,
  rawResumeLength: number
): boolean {
  if (experience.length !== 1) return false;
  const only = experience[0];
  const company = (only.company || "").trim();
  const lines = (only.description || "").split("\n").filter((l) => l.trim().length > 0).length;
  if (/^(work\s+)?experience$/i.test(company)) return true;
  if (rawResumeLength > 1200 && lines >= 14) return true;
  return false;
}

export async function intakeParserNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  try {
    const cleanedResume = repairPdfLigatures(state.rawResume || "");
    console.log(`[intakeParser] ▶ Intake parser started (rawResume chars: ${cleanedResume.length})`);

    // 1. Fast deterministic parse first (<10ms)
    // Runs unless useLLMParser is explicitly requested
    const deterministicAST = !(state as any).useLLMParser
      ? parseResume(cleanedResume)
      : { experience: [], sections: [], contactInfo: {}, education: [], skills: { technical: [], soft: [] }, summary: null };

    const suspiciousCollapse = isSuspiciousSingleJobParse(deterministicAST.experience, cleanedResume.length);

    if (deterministicAST.experience.length > 0 && !suspiciousCollapse) {
      console.log(`[intakeParser] ✔ Fast deterministic parser succeeded: ${deterministicAST.experience.length} jobs, summary: ${deterministicAST.summary ? "present" : "none"}, sections: ${deterministicAST.sections.join(", ")}`);
      return {
        rawResume: cleanedResume,
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

    // 2. Gated Fallback: If deterministic parsing found 0 jobs or collapsed a multi-job resume, use bounded LLM parser
    console.log(`[intakeParser] ⚡ Deterministic parser ${suspiciousCollapse ? "collapsed multi-job resume" : "found 0 jobs"}; gating to LLM resume parser...`);
    const resumeAST = await parseResumeWithLLM(
      cleanedResume,
      // Route through the runtime cost guard so the per-step model policy applies
      // to the agent path too (token-light read node -> cheapest model).
      resolveStepModel("readResume", state.modelKey),
      state.sessionApiKeys,
      1 // 1 bounded attempt to preserve pipeline timeout budget
    );
    console.log(`[intakeParser] ✔ LLM parser generated: ${resumeAST.experience.length} jobs, summary: ${resumeAST.summary ? "present" : "none"}, sections: ${resumeAST.sections.join(", ")}`);
    return {
      rawResume: cleanedResume,
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
