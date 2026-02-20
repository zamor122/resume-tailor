/**
 * Quality Assurance utility for validating AI-generated resume improvements
 */

export interface QualityMetrics {
  hasMetrics: boolean;
  metricsCount: number;
  hasNaturalLanguage: boolean;
  hasClichés: boolean;
  clichéCount: number;
  improvementScore: number; // 0-100
  overallScore: number; // 0-100
}

export interface AuthenticityMetrics {
  aiSmellScore: number; // 0-100 (lower is better)
  polishedPhraseHits: number;
  repetitiveBulletStarts: number;
  firstPersonPronounHits: number;
}

const COMMON_CLICHÉS = [
  'results-driven',
  'detail-oriented',
  'team player',
  'self-motivated',
  'hard-working',
  'go-getter',
  'think outside the box',
  'synergy',
  'leverage',
  'paradigm shift',
  'best practices',
  'proven track record',
  'dynamic',
  'visionary',
  'enthusiastic',
  'passionate about',
  'dedicated',
  'committed',
  'expertise in',
  'extensive experience'
];

const AI_SMELL_PATTERNS: RegExp[] = [
  /culture-focused approach/gi,
  /security-first design patterns?/gi,
  /ai-enhanced (solutions|data processing)/gi,
  /leveraging\s+.+?\s+to\s+drive/gi,
  /applying\s+.+?\s+to\s+enhance/gi,
  /best practices/gi,
  /cutting-edge/gi,
  /industry standard/gi,
];

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\butilize\b/gi, 'use'],
  [/\bleverage\b/gi, 'use'],
  [/\bsynergy\b/gi, 'collaboration'],
  [/\bresults-driven\b/gi, 'outcome-focused'],
  [/\bdetail-oriented\b/gi, 'precise'],
  [/\bproven track record\b/gi, 'track record'],
  [/\bpassionate about\b/gi, 'focused on'],
  [/\bteam player\b/gi, 'collaborative contributor'],
  [/\bbest practices\b/gi, 'production standards'],
  [/\bcutting-edge\b/gi, 'modern'],
];

/**
 * Validate quality of AI-generated resume improvements
 */
export function validateQuality(
  originalText: string,
  improvedText: string
): QualityMetrics {
  const metrics = {
    hasMetrics: false,
    metricsCount: 0,
    hasNaturalLanguage: false,
    hasClichés: false,
    clichéCount: 0,
    improvementScore: 0,
    overallScore: 0
  };
  
  // Check for metrics (numbers, percentages, quantities)
  const metricPatterns = [
    /\d+%/g, // Percentages
    /\d+\s*(years?|months?|days?)/gi, // Time periods
    /\$\d+[KMB]?/g, // Money
    /\d+\s*(users?|customers?|clients?|projects?|team members?)/gi, // Counts
    /increased by \d+/gi,
    /reduced by \d+/gi,
    /\d+x\s*(improvement|increase|growth)/gi
  ];
  
  for (const pattern of metricPatterns) {
    const matches = improvedText.match(pattern);
    if (matches) {
      metrics.hasMetrics = true;
      metrics.metricsCount += matches.length;
    }
  }
  
  // Check for clichés
  const lowerText = improvedText.toLowerCase();
  for (const cliché of COMMON_CLICHÉS) {
    if (lowerText.includes(cliché.toLowerCase())) {
      metrics.hasClichés = true;
      metrics.clichéCount++;
    }
  }
  
  // Check for natural language (variety of sentence structures, not repetitive)
  const sentences = improvedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const uniqueStarts = new Set(
    sentences.map(s => s.trim().substring(0, 10).toLowerCase())
  );
  metrics.hasNaturalLanguage = uniqueStarts.size > sentences.length * 0.5;
  
  // Calculate improvement score
  let improvementScore = 0;
  
  // Metrics bonus
  if (metrics.hasMetrics) improvementScore += 30;
  improvementScore += Math.min(metrics.metricsCount * 5, 20);
  
  // Natural language bonus
  if (metrics.hasNaturalLanguage) improvementScore += 20;
  
  // Cliché penalty
  improvementScore -= metrics.clichéCount * 10;
  improvementScore = Math.max(0, improvementScore);
  
  // Length improvement (if improved text is more substantial)
  if (improvedText.length > originalText.length * 1.1) {
    improvementScore += 10;
  }
  
  // Action verbs bonus
  const actionVerbs = ['led', 'managed', 'increased', 'improved', 'developed', 'created', 'achieved', 'delivered', 'optimized', 'implemented'];
  const hasActionVerbs = actionVerbs.some(verb => lowerText.includes(verb));
  if (hasActionVerbs) improvementScore += 10;
  
  metrics.improvementScore = Math.min(100, improvementScore);
  
  // Calculate overall score
  metrics.overallScore = (
    (metrics.hasMetrics ? 30 : 0) +
    (metrics.hasNaturalLanguage ? 30 : 0) +
    (metrics.clichéCount === 0 ? 20 : Math.max(0, 20 - metrics.clichéCount * 5)) +
    Math.min(metrics.improvementScore / 2, 20)
  );
  
  return metrics;
}

/**
 * Deterministically rewrite common AI-sounding phrasing while preserving resume meaning.
 */
export function normalizeAIPhrasing(text: string): { text: string; replacements: number } {
  let normalized = text;
  let replacements = 0;

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    const matches = normalized.match(pattern);
    if (matches) {
      replacements += matches.length;
      normalized = normalized.replace(pattern, replacement);
    }
  }

  return { text: normalized, replacements };
}

/**
 * Measures whether resume output sounds machine-generated.
 */
export function measureAuthenticity(text: string): AuthenticityMetrics {
  let polishedPhraseHits = 0;
  for (const pattern of AI_SMELL_PATTERNS) {
    polishedPhraseHits += text.match(pattern)?.length ?? 0;
  }

  const bulletStarts = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, '').split(/\s+/)[0]?.toLowerCase())
    .filter(Boolean);

  const bulletStartCounts = new Map<string, number>();
  for (const start of bulletStarts) {
    bulletStartCounts.set(start, (bulletStartCounts.get(start) ?? 0) + 1);
  }
  const repetitiveBulletStarts = Array.from(bulletStartCounts.values()).filter((count) => count >= 3).length;
  const firstPersonPronounHits = text.match(/\b(i|my|me|mine)\b/gi)?.length ?? 0;

  const aiSmellScore = Math.min(
    100,
    polishedPhraseHits * 18 + repetitiveBulletStarts * 14 + firstPersonPronounHits * 6
  );

  return {
    aiSmellScore,
    polishedPhraseHits,
    repetitiveBulletStarts,
    firstPersonPronounHits,
  };
}

/**
 * Get quality recommendations based on metrics
 */
export function getQualityRecommendations(metrics: QualityMetrics): string[] {
  const recommendations: string[] = [];
  
  if (!metrics.hasMetrics) {
    recommendations.push('Add specific metrics and quantifiable achievements');
  }
  
  if (metrics.clichéCount > 0) {
    recommendations.push(`Remove ${metrics.clichéCount} cliché phrase(s) for more authentic language`);
  }
  
  if (!metrics.hasNaturalLanguage) {
    recommendations.push('Vary sentence structure for more natural flow');
  }
  
  if (metrics.overallScore < 60) {
    recommendations.push('Consider more substantial improvements to increase quality score');
  }
  
  return recommendations;
}




