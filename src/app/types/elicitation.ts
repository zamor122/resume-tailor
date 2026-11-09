/**
 * Guided-elicitation types ("A few things your resume didn't say").
 *
 * The user is the ONLY source of every number. A fact here is a question we asked
 * and the answer the user typed (or skipped). Nothing in this pipeline invents,
 * rounds, scales or otherwise strengthens what the user wrote.
 */

export interface ElicitationQuestion {
  /** Stable id so the client can key answers back to the question. */
  id: string;
  /** Plain-English, non-technical, answerable by anyone. */
  question: string;
}

/**
 * A single user-supplied fact flowing into tailoring.
 * `answer` is the user's own words, verbatim — the tailoring node must never
 * paraphrase it into a stronger claim.
 */
export interface ElicitationFact {
  question: string;
  answer: string;
}

export const ELICITATION_MIN_QUESTIONS = 3;
export const ELICITATION_MAX_QUESTIONS = 5;
