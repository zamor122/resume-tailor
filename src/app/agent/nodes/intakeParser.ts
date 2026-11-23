import type { AgentState } from "../state";
import { parseResume } from "@/app/utils/resumeParser";
import { parseResumeWithLLM } from "@/app/utils/resumeParserLLM";
import { resolveStepModel } from "@/app/runtime/cost-guard";
import { emitAgentProgress } from "@/app/utils/agentProgressEmitter";

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

function shouldFallbackToLLMParser(
  ast: {
    summary?: string | null;
    education?: unknown[];
    experience: Array<{ company?: string; title?: string; description?: string }>;
  },
  rawResumeLength: number
): { fallback: boolean; reason: string } {
  const experience = ast.experience || [];
  if (experience.length === 0) {
    return { fallback: true, reason: "found 0 jobs" };
  }

  // Collapsed header swallowed resume sections/bullets into company or title
  if (experience.some((e) => (e.company || "").trim().length > 100 || (e.title || "").trim().length > 120)) {
    return { fallback: true, reason: "overlong job header indicates collapsed text" };
  }

  // Experience entries extracted without any bullet/description content
  const totalDescChars = experience.reduce((sum, e) => sum + (e.description || "").trim().length, 0);
  if (rawResumeLength > 250 && totalDescChars < 40) {
    return { fallback: true, reason: "extracted jobs have empty descriptions" };
  }
  if (rawResumeLength > 500 && totalDescChars < 120) {
    return { fallback: true, reason: "insufficient experience description text" };
  }

  if (experience.length === 1) {
    const only = experience[0];
    const company = (only.company || "").trim();
    const lines = (only.description || "").split("\n").filter((l) => l.trim().length > 0).length;
    if (/^(work\s+)?experience$/i.test(company)) {
      return { fallback: true, reason: "section header captured as company" };
    }
    if (rawResumeLength > 1200 && lines >= 14) {
      return { fallback: true, reason: "collapsed multi-job resume" };
    }
  }

  return { fallback: false, reason: "" };
}

export async function intakeParserNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  try {
    const cleanedResume = repairPdfLigatures(state.rawResume || "");
    console.log(`[intakeParser] ▶ Intake parser started (rawResume chars: ${cleanedResume.length})`);
    emitAgentProgress({
      step: "analyzing",
      tool: "Resume Extractor",
      message: "Reading sections, roles, and accomplishment bullets...",
      progress: 18,
    });

    // 1. Fast deterministic parse first (<10ms)
    // Runs unless useLLMParser is explicitly requested
    const deterministicAST = !(state as any).useLLMParser
      ? parseResume(cleanedResume)
      : { experience: [], sections: [], contactInfo: {}, education: [], skills: { technical: [], soft: [] }, summary: null };

    const { fallback, reason } = shouldFallbackToLLMParser(deterministicAST, cleanedResume.length);

    if (!fallback) {
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

    // 2. Gated Fallback: If deterministic parsing found 0 jobs or collapsed/empty descriptions, use bounded LLM parser
    console.log(`[intakeParser] ⚡ Deterministic parser ${reason}; gating to LLM resume parser...`);
    emitAgentProgress({
      step: "analyzing",
      tool: "AI Structure Parser",
      message: "Unpacking unformatted resume text into structured job history...",
      progress: 23,
    });
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
