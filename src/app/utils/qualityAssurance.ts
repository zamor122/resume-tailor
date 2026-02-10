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





