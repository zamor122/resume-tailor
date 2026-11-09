/**
 * Guided elicitation ("A few things your resume didn't say").
 *
 * Ask 3-5 plain-English questions that surface TRUE specifics the candidate
 * already knows but didn't write down (scale, outcomes, size). The answers are
 * user-supplied facts and are the ONLY place new numbers may come from.
 *
 * Anti-fabrication contract (PRODUCT-DIRECTION.md §3.2c):
 *  - The USER is the source of every number. We never invent, round, scale up
 *    or "improve" a figure they gave.
 *  - We never paraphrase an answer into a stronger claim than the user made.
 *  - A skipped question leaves the pipeline behaving exactly as before.
 */
import type { ElicitationFact, ElicitationQuestion } from "@/app/types/elicitation";
import {
  ELICITATION_MAX_QUESTIONS,
  ELICITATION_MIN_QUESTIONS,
} from "@/app/types/elicitation";

/** Vocabulary that must never leak into a question shown to a non-technical user. */
const FORBIDDEN_TERMS = [
  "token",
  "temperature",
  "prompt",
  "parsed",
  "parse",
  "model",
  "embedding",
  "vector",
  "ats score",
  "json",
];

const MAX_QUESTION_LENGTH = 180;
const MAX_FACT_LENGTH = 400;

/**
 * Neutralize an untrusted string before it reaches a prompt governing block.
 * Collapses whitespace and strips quote/backtick/backslash characters that could
 * break out of the surrounding slot. Weakening-only: it can never strengthen a
 * user's claim. Returns "" for non-strings/whitespace so callers treat it as absent.
 */
export function sanitizeElicitationValue(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const collapsed = value.replace(/\s+/g, " ").replace(/["'`\\]/g, "").trim();
  if (!collapsed) return "";
  return collapsed.length > maxLength ? collapsed.slice(0, maxLength).trim() : collapsed;
}

/** Remove leading numbering/bullets ("1. ", "- ", "• ") a model may add. */
function stripListMarker(question: string): string {
  return question.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
}

/**
 * Line-based rescue for models that ignore the "Output ONLY a JSON array" instruction and
 * reply with a numbered/bulleted list of questions in prose. Keeps only lines that read as
 * a question to a person, so ordinary prose in the reply is not mistaken for one.
 */
function extractLineQuestions(rawText: string): string[] {
  const out: string[] = [];
  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = stripListMarker(rawLine).replace(/^["'`]|["'`]$/g, "").trim();
    if (line.length < 15 || line.length > MAX_QUESTION_LENGTH) continue;
    const looksLikeQuestion =
      line.endsWith("?") ||
      /^(what|how|which|who|when|where|why|can you|could you|did you|do you|describe|tell me|roughly|think of)\b/i.test(
        line
      );
    if (!looksLikeQuestion) continue;
    out.push(line);
    if (out.length >= ELICITATION_MAX_QUESTIONS) break;
  }
  return out;
}

function isPlainEnglish(question: string): boolean {
  const lower = question.toLowerCase();
  return !FORBIDDEN_TERMS.some((term) => lower.includes(term));
}

/**
 * Prompt asking the model to write 3-5 targeted, plain-English questions about
 * specifics the resume is missing relative to this job. The model writes
 * QUESTIONS only — never numbers, never answers.
 */
export function buildElicitationQuestionPrompt(
  resume: string,
  jobDescription: string,
  jobTitle?: string
): string {
  const roleLine = jobTitle?.trim() ? `Target role: ${jobTitle.trim()}\n` : "";
  return `You are a warm, plain-spoken resume coach. Read the candidate's resume and the job posting, then write 3 to 5 short questions that ask the candidate for TRUE SPECIFICS their resume left out — the kind of concrete detail (scale, results, size, outcomes) that makes a resume land.

${roleLine}STRICT RULES:
- Write QUESTIONS ONLY. Never write example numbers, never suggest a value, never answer the question.
- Plain English a non-technical person can answer on the spot. No jargon at all. Never use these words: token, model, prompt, temperature, parsed, ATS, JSON.
- Target THIS resume and THIS job: reference the candidate's actual work and the things this job cares about.
- Ask about things a person already knows but may not have written down, e.g. how many people something affected, what changed for the business, how big or long something was, how many of something there were.
- Each question must be answerable with a sentence or a number the candidate supplies.
- If you cannot find anything specific, ask a general but still concrete question about their most relevant work.

Resume:
"""
${resume.slice(0, 6000)}
"""

Job posting:
"""
${jobDescription.slice(0, 3000)}
"""

Output ONLY a JSON array of 3 to 5 strings, e.g. ["Question one?", "Question two?"]. No other text.`;
}

/**
 * Parse a model response into 3-5 clean, jargon-free questions.
 * Returns [] when the model produced nothing usable, so the caller can fall back to the
 * generic questions AND label them as such — padding here used to make a silent model
 * miss indistinguishable from a real generation (the route labelled both "generated").
 */
export function parseElicitationQuestions(rawText: string): ElicitationQuestion[] {
  const candidates: string[] = [];

  try {
    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const q =
            typeof item === "string"
              ? item
              : item && typeof item === "object" && typeof (item as { question?: unknown }).question === "string"
              ? (item as { question: string }).question
              : "";
          const cleaned = sanitizeElicitationValue(stripListMarker(q), MAX_QUESTION_LENGTH);
          if (cleaned) candidates.push(cleaned);
        }
      }
    }
  } catch {
    // ignore — fall through to line-based parsing / fallback
  }

  // The model does not always honour "Output ONLY a JSON array" — it may reply with a
  // numbered or bulleted list of questions in prose. This is the line-based fallback the
  // comment above always advertised but which was never implemented, so genuinely
  // tailored questions were being thrown away and replaced by the generic ones.
  if (candidates.length === 0) {
    candidates.push(...extractLineQuestions(rawText));
  }

  const unique: string[] = [];
  for (const q of candidates) {
    if (!isPlainEnglish(q)) continue;
    if (unique.some((existing) => existing.toLowerCase() === q.toLowerCase())) continue;
    unique.push(q);
    if (unique.length >= ELICITATION_MAX_QUESTIONS) break;
  }

  // Nothing usable from the model -> hand the caller an empty list so it can supply the
  // honest fallback and label it accordingly. Padding here is what made a silent model
  // miss indistinguishable from a real generation.
  if (unique.length === 0) return [];

  const padded = [...unique];
  if (padded.length < ELICITATION_MIN_QUESTIONS) {
    for (const fallback of fallbackElicitationQuestions()) {
      if (padded.length >= ELICITATION_MIN_QUESTIONS) break;
      if (padded.some((existing) => existing.toLowerCase() === fallback.question.toLowerCase())) continue;
      padded.push(fallback.question);
    }
  }

  return padded
    .slice(0, ELICITATION_MAX_QUESTIONS)
    .map((question, index) => ({ id: `q${index + 1}`, question }));
}

/**
 * Generic, always-safe questions used when the model is unavailable or returns
 * nothing usable. Still concrete, still optional, still number-free.
 */
export function fallbackElicitationQuestions(): ElicitationQuestion[] {
  return [
    { id: "q1", question: "Think of the work you're most proud of in this area — roughly how many people or customers did it affect?" },
    { id: "q2", question: "What changed for the business because of that work? (for example: fewer support calls, faster turnaround, more sales)" },
    { id: "q3", question: "How big was that project — how long did it take, or how many people were involved?" },
  ];
}

/**
 * Build the governing prompt block carrying the candidate's OWN words.
 *
 * Hard rules are stated so the writer can only USE these facts, never inflate
 * them. Where a fact does not fit a bullet, it is omitted — never replaced with
 * an invented number. If the block is empty (everything skipped), this returns
 * "" so the prompt is byte-identical to today's output.
 */
export function buildUserSuppliedFactsBlock(facts?: ElicitationFact[]): string {
  if (!facts || facts.length === 0) return "";

  const lines: string[] = [];
  for (const fact of facts) {
    const question = sanitizeElicitationValue(fact?.question, MAX_QUESTION_LENGTH);
    const answer = sanitizeElicitationValue(fact?.answer, MAX_FACT_LENGTH);
    if (!answer) continue;
    lines.push(question ? `- Asked: "${question}"\n  Candidate answered: "${answer}"` : `- Candidate supplied: "${answer}"`);
  }
  if (lines.length === 0) return "";

  return `CANDIDATE-SUPPLIED FACTS (TRUE — these came directly from the candidate, in their own words):
${lines.join("\n")}

FACT-HANDLING RULES (absolute):
- These facts are TRUE and MAY be used to make a bullet or the summary concrete where one of them naturally applies. This is the ONLY source of any new number or scope beyond the original resume text.
- USE THE CANDIDATE'S OWN WORDS for every number and every unit of scale. NEVER round, add "+", scale up, change units, or replace their wording with words like "dozens", "many", or "numerous".
  * If they said "maybe 20 people", write "maybe 20 people" or "roughly 20 people" at most — NEVER "20+ users" or "dozens of users".
  * If they gave no number, do NOT supply one.
- NEVER invent, estimate, or infer a number, percentage, headcount, budget, volume or outcome that is not present in the facts above or the original text.
- Use a fact ONLY where it fits the bullet it belongs to. If a fact does not fit, IGNORE it — do not force it, and do not substitute an invented figure.
- Never combine facts to imply a larger claim than the candidate made.`;
}
