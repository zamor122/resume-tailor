import type { ResumeSuggestion } from "@/app/agent/state";

/**
 * Plain-English reasons for a suggested change.
 *
 * Per PRODUCT-DIRECTION.md §4, the result screen must explain each change in a
 * short, non-technical line a non-expert can judge ("used the words this job
 * posting uses"), never in algorithm jargon. A suggestion already carries a
 * `reason`; we reuse it only when it is genuinely plain English, otherwise we
 * derive an honest one from what the edit actually did by comparing the
 * original and suggested text. If a change cannot be described accurately in
 * plain words, we return null and the UI simply omits the reason.
 */

/** Words/phrasings that would count as jargon for a non-technical reader. */
const JARGON_PATTERNS: RegExp[] = [
  /\btokens?\b/i,
  /\bmodels?\b/i,
  /\bprompts?\b/i,
  /\bparsed?\b/i,
  /\bparsing\b/i,
  /\btemperature\b/i,
  /\bembeddings?\b/i,
  /\bllms?\b/i,
  /\bvectors?\b/i,
  /\bsemantic\b/i,
  /\bats\b/i,
  /\bkeywords?\b/i,
  /\boptimiz(e|es|ed|ing|ation)\b/i,
  /\bsynthesis(e|ed|ing)?\b/i,
  /\bsynthesiz(e|es|ed|ing)\b/i,
  /\brefram(e|es|ed|ing)\b/i,
  /\bcompetenc(y|ies)\b/i,
  /\bquantif(y|ies|ied|iable|ication)\b/i,
  /\baction\s+verbs?\b/i,
  /\bboolean\b/i,
  /\bregex\b/i,
];

/** True when a reason reads like plain English a non-expert could understand. */
export function isPlainEnglishReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  const text = reason.trim();
  if (text.length === 0 || text.length > 90) return false;
  if (/[{}[\]<>/\\|]/.test(text)) return false;
  return !JARGON_PATTERNS.some((pattern) => pattern.test(text));
}

function numbersIn(text: string): string[] {
  return (text.match(/\b\d[\d,.]*\b/g) || []).map((n) => n.replace(/[.,]$/, ""));
}

/** Verdicts / involvement language that hides what the person actually did. */
const INVOLVEMENT =
  /\b(helped|working on|worked on|work on|assisted|support(ed|ing)?|participat(ed|ing)|involved|contributed to|part of|did work on)\b/i;

/** Direct, outcome-y verbs a stronger bullet tends to lead with. */
const STRONG_ACTION =
  /\b(led|built|designed|developed|implemented|launched|delivered|created|managed|drove|drove|owned|shipped|migrated|increased|reduced|improved|achieved|established|spearheaded|streamlined|automated|resolved|cut|grew|scaled|coordinated|executed)\b/i;

/** Pure filler phrases that carry no information. */
const FILLER = /\b(responsible for|duties included|tasked with|in charge of)\b/i;

function deriveFromDiff(s: ResumeSuggestion): string | null {
  const original = (s.originalText || "").trim();
  const suggested = (s.suggestedText || "").trim();
  if (!suggested) return null;

  // 1. A number the user supplied that wasn't in the original.
  const originalNumbers = numbersIn(original);
  const newNumber = numbersIn(suggested).find((n) => !originalNumbers.includes(n));
  if (newNumber) return `added the number you gave us (${newNumber})`;

  // 2. A word the job posting uses, newly present in the bullet.
  const addedKeyword = (s.keywords || []).find((keyword) => {
    const k = keyword.trim().toLowerCase();
    return (
      k.length > 2 &&
      suggested.toLowerCase().includes(k) &&
      !original.toLowerCase().includes(k)
    );
  });
  if (addedKeyword) return "used the words this job posting uses";

  // 3. "Helped / worked on" style involvement turned into a direct action.
  if (
    INVOLVEMENT.test(original) &&
    STRONG_ACTION.test(suggested) &&
    !STRONG_ACTION.test(original)
  ) {
    return "said what you did, not just that you were involved";
  }

  // 4. Filler phrases dropped.
  if (FILLER.test(original) && !FILLER.test(suggested)) {
    return "removed filler like 'responsible for'";
  }

  // Cannot describe this change accurately in plain English — omit the reason.
  return null;
}

/**
 * The one-line, plain-English reason for a single change (or null to omit).
 * Prefers the suggestion's own reason when it is genuinely plain English.
 */
export function plainEnglishReason(s: ResumeSuggestion): string | null {
  const existing = s.reason?.trim();
  if (existing && isPlainEnglishReason(existing)) return existing;
  return deriveFromDiff(s);
}
