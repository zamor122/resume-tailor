/**
 * CENTRALIZED PROMPTS - MAIN EXPORT
 * 
 * This is the main entry point for all prompts in the application.
 * All prompts are organized by category and can be imported from here.
 * 
 * Usage:
 *   import { getTailoringPrompt } from '@/app/prompts';
 *   import { getRelevancyScorePrompt } from '@/app/prompts';
 * 
 * Categories:
 *   - tailoring.ts: Resume tailoring prompts
 *   - evaluation.ts: Scoring, validation, AI detection
 *   - tools.ts: Analysis tool prompts
 *   - utils.ts: Utility prompts (job title, company research, etc.)
 */

// Tailoring prompts
export { getTailoringPrompt } from './tailoring';

// Evaluation prompts
export {
  getRelevancyScorePrompt,
  getResumeValidationPrompt,
  getAIDetectionPrompt,
} from './evaluation';

// Keyword extraction (MCP tool)
export { getKeywordExtractorPrompt } from './keyword-extraction';

// Tool prompts
export {
  getKeywordAnalyzerPrompt,
  getSkillsGapPrompt,
  getMultiJobComparisonPrompt,
  getATSOptimizerPrompt,
  getATSSimulatorPrompt,
  getInterviewPrepPrompt,
  getResumeStorytellerPrompt,
  getResumeVersionAnalysisPrompt,
  getResumeVersionComparisonPrompt,
  getSkillsMarketValuePrompt,
  getFormatValidatorPrompt,
} from './tools';

// Utility prompts
export {
  getJobTitleExtractionPrompt,
  getCompanyExtractionPrompt,
  getCompanyResearchPrompt,
  getJobDescriptionEnhancementPrompt,
  getDiffExplanationPrompt,
} from './utils';

// Enhancement prompts
export { getEnhancementPrompt } from './enhancement';

// Metrics prompts
export { formatMetricsGuidance } from './metrics';



