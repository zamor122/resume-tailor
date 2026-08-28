import type { RecipeConfig, RecipeNode } from './types';

// ---------------------------------------------------------------
// Recipe definitions — maps pipeline ids to runtime DAGs.
// These correspond 1:1 to INTENT_PIPELINES in config/pipelines.ts.
// ---------------------------------------------------------------

const applyToJobNodes: RecipeNode[] = [
  { stepId: 'readResume' },
  { stepId: 'extractKeywords', dependsOn: ['readResume'] },
  { stepId: 'researchCompany', dependsOn: ['readResume'] },
  { stepId: 'parseNormalize', dependsOn: ['readResume'] },
  { stepId: 'metricsContext', dependsOn: ['readResume'] },
  { stepId: 'baselineScore', dependsOn: ['parseNormalize', 'extractKeywords'] },
  {
    stepId: 'tailor',
    dependsOn: ['baselineScore', 'extractKeywords', 'researchCompany', 'metricsContext'],
  },
  { stepId: 'reScore', dependsOn: ['tailor'] },
  { stepId: 'sanitize', dependsOn: ['tailor'] },
  { stepId: 'assemble', dependsOn: ['sanitize', 'reScore'] },
];

const checkResumeNodes: RecipeNode[] = [
  { stepId: 'readResume' },
  { stepId: 'parseNormalize', dependsOn: ['readResume'] },
  { stepId: 'sanitize', dependsOn: ['parseNormalize'] },
];

const prepareInterviewNodes: RecipeNode[] = [
  { stepId: 'readResume' },
  { stepId: 'extractKeywords', dependsOn: ['readResume'] },
  { stepId: 'researchCompany', dependsOn: ['readResume'] },
];

const fullOptimizationNodes: RecipeNode[] = [
  { stepId: 'readResume' },
  { stepId: 'extractKeywords', dependsOn: ['readResume'] },
  { stepId: 'researchCompany', dependsOn: ['readResume'] },
  { stepId: 'parseNormalize', dependsOn: ['readResume'] },
  { stepId: 'metricsContext', dependsOn: ['readResume'] },
  { stepId: 'baselineScore', dependsOn: ['parseNormalize', 'extractKeywords'] },
  {
    stepId: 'tailor',
    dependsOn: ['baselineScore', 'extractKeywords', 'researchCompany', 'metricsContext'],
  },
  { stepId: 'reScore', dependsOn: ['tailor'] },
  { stepId: 'sanitize', dependsOn: ['tailor'] },
  { stepId: 'assemble', dependsOn: ['sanitize', 'reScore'] },
];

// ---------------------------------------------------------------
// Recipe catalog
// ---------------------------------------------------------------

export const RECIPES: Record<string, RecipeConfig> = {
  apply_to_job: {
    id: 'apply_to_job',
    name: 'Apply to Job',
    description: 'Full tailor, validation, and job match optimization.',
    nodes: applyToJobNodes,
    totalBudget: 40_000,
  },
  check_resume: {
    id: 'check_resume',
    name: 'Check Resume',
    description: 'Validate formatting and structure.',
    nodes: checkResumeNodes,
    totalBudget: 8_000,
  },
  prepare_interview: {
    id: 'prepare_interview',
    name: 'Prepare Interview',
    description: 'Skills gap analysis and interview questions.',
    nodes: prepareInterviewNodes,
    totalBudget: 10_000,
  },
  full_optimization: {
    id: 'full_optimization',
    name: 'Full Optimization',
    description: 'Format check, skills gap, tailor, validate, interview prep.',
    nodes: fullOptimizationNodes,
    totalBudget: 40_000,
  },
};

export function getRecipe(id: string): RecipeConfig {
  const recipe = RECIPES[id];
  if (!recipe) {
    throw new Error(`Unknown recipe: "${id}". Available: ${Object.keys(RECIPES).join(', ')}`);
  }
  return recipe;
}