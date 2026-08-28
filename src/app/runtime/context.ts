import type { InputSelector, StepInputs } from './types';

// ---------------------------------------------------------------
// Input selectors — each extracts a specific slice from a session.
// These are THE mechanism that keeps every prompt below free-tier
// token caps (DESIGN principle #4).
// ---------------------------------------------------------------

export type SelectorFn = (session: Record<string, unknown>) => unknown;

const selectors: Record<InputSelector, SelectorFn> = {
  /** The raw resume text (full, unsanitized). */
  resume: (s) => s.resume ?? '',

  /** The cleaned job description. */
  jobDescription: (s) => s.jobDescription ?? '',

  /** The parsed, canonical resume document (after readResume node). */
  parsedResume: (s) => s.parsedResume ?? null,

  /** Extracted keywords (after extractKeywords node). */
  keywords: (s) => s.keywords ?? null,

  /** Company research context (after researchCompany node). */
  companyContext: (s) => s.companyContext ?? null,

  /** Deterministic metrics (after metricsContext node). */
  metrics: (s) => s.metrics ?? null,

  /** Baseline ATS/relevancy score (before tailoring). */
  baselineScore: (s) => s.baselineScore ?? null,

  /** Generated tailored resume (after tailor node). */
  tailoredResume: (s) => s.tailoredResume ?? null,

  /** User-provided custom instructions string. */
  customInstructions: (s) => s.customInstructions ?? '',

  /** User-selected keywords to weave in. */
  keywordsToWeave: (s) => s.keywordsToWeave ?? [],

  /** Prompt preset ids selected by the user. */
  promptPresetIds: (s) => s.promptPresetIds ?? [],

  /** Current session id. */
  sessionId: (s) => s.sessionId ?? null,

  /** Authenticated user id (null for anonymous free-tier single-tailor). */
  userId: (s) => s.userId ?? null,
};

// ---------------------------------------------------------------
// Resolution: given required selectors, build a StepInputs bag
// ---------------------------------------------------------------

export function resolveStepInputs(
  required: InputSelector[],
  session: Record<string, unknown>
): StepInputs {
  const inputs: StepInputs = {};
  for (const sel of required) {
    const fn = selectors[sel];
    if (!fn) {
      throw new Error(`Unknown input selector: "${sel}"`);
    }
    inputs[sel] = fn(session);
  }
  return inputs;
}

/**
 * Validate that all required selectors are either defined in the
 * selectors map or are known runtime-only fields.
 */
export function validateSelectors(required: InputSelector[]): void {
  for (const sel of required) {
    if (!(sel in selectors)) {
      throw new Error(`Unknown input selector: "${sel}". Must be a declared key in context.ts.`);
    }
  }
}