import type { StepId, StepSchema, StepFn, StepRegistry } from './types';
import { validateSelectors } from './context';

// ---------------------------------------------------------------
// The allowlist registry — the only place steps are defined.
// The executor refuses to run anything not in this map.
// ---------------------------------------------------------------

const _registry = new Map<StepId, StepSchema>();

function register(schema: StepSchema): void {
  // Validate selectors at registration time (fail early).
  validateSelectors(schema.requires);
  _registry.set(schema.id, schema);
}

// ---- LLM read nodes (read arbitrary text into canonical structure) ----

register({
  id: 'readResume',
  description: 'Read resume into canonical ResumeDocument structure.',
  requires: ['resume'],
  outputSchema: 'ResumeDocument',
  costClass: 'free',
  maxTokens: 4000,
});

register({
  id: 'extractKeywords',
  description: 'Extract keywords and critical terms from the job description.',
  requires: ['jobDescription'],
  outputSchema: 'KeywordList',
  costClass: 'free',
  maxTokens: 3000,
});

register({
  id: 'researchCompany',
  description: 'Research company name and industry from JD.',
  requires: ['jobDescription'],
  outputSchema: 'CompanyContext',
  costClass: 'free',
  maxTokens: 2000,
});

// ---- Heavy generation node (the actual tailoring) ----

register({
  id: 'tailor',
  description: 'Generate the tailored resume from selected context.',
  requires: ['resume', 'jobDescription', 'keywords', 'companyContext', 'metrics', 'baselineScore'],
  outputSchema: 'TailoredResume (JSON)',
  costClass: 'free',
  maxTokens: 20000,
});

// ---- Pure deterministic nodes (post-gen validation/sanitization) ----

register({
  id: 'parseNormalize',
  description: 'Deterministic normalization of parsed resume.',
  requires: ['parsedResume'],
  outputSchema: 'NormalizedResume',
  costClass: 'free',
  maxTokens: 0, // No LLM — pure function.
});

register({
  id: 'metricsContext',
  description: 'Compute deterministically from resume data.',
  requires: ['resume'],
  outputSchema: 'MetricsBag',
  costClass: 'free',
  maxTokens: 0,
});

register({
  id: 'baselineScore',
  description: 'Pre-tailor relevancy score.',
  requires: ['resume', 'jobDescription'],
  outputSchema: 'Score',
  costClass: 'free',
  maxTokens: 0,
});

register({
  id: 'reScore',
  description: 'Post-tailor relevancy score comparison.',
  requires: ['tailoredResume', 'jobDescription'],
  outputSchema: 'ScoreComparison',
  costClass: 'free',
  maxTokens: 0,
});

register({
  id: 'sanitize',
  description: 'ATS sanitization + contact block normalization.',
  requires: ['tailoredResume'],
  outputSchema: 'SanitizedResume',
  costClass: 'free',
  maxTokens: 0,
});

register({
  id: 'assemble',
  description: 'Assemble final output (obfuscation, free-reveal, persist).',
  requires: ['tailoredResume', 'resume', 'metrics', 'sessionId', 'userId'],
  outputSchema: 'FinalPayload (SSE complete)',
  costClass: 'free',
  maxTokens: 0,
});

// ---------------------------------------------------------------
// Pablic ABI
// ---------------------------------------------------------------

export function getStepSchema(id: StepId): StepSchema | undefined {
  return _registry.get(id);
}

export function getAllSchemas(): StepSchema[] {
  return Array.from(_registry.values());
}

export function isRegistered(id: StepId): boolean {
  return _registry.has(id);
}

export function assertRegistered(id: StepId): StepSchema {
  const schema = _registry.get(id);
  if (!schema) {
    throw new Error(
      `Unregistered step: "${id}". Steps MUST be registered in the allowlist (registry.ts).`
    );
  }
  return schema;
}