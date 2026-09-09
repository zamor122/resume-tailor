/**
 * User-controlled levers for how aggressively the AI tailors the resume.
 * Passed from client -> API -> agent graph -> prompts.
 */
export type IntensityLevel = 'minimal' | 'targeted' | 'overhaul';
export type MetricsMode = 'strict' | 'placeholders' | 'benchmarks';
export type SeniorityLevel = 'mid' | 'senior' | 'executive';

export interface TailoringPreferences {
  /** How many bullets / sections the AI may alter */
  intensity: IntensityLevel;
  /** How the AI handles metrics and quantification */
  metricsMode: MetricsMode;
  /** Seniority framing for language register */
  seniorityLevel: SeniorityLevel;
  /** Granular section scope */
  sectionsToModify: {
    summary: boolean;
    experience: boolean;
    skills: boolean;
  };
}

export const DEFAULT_PREFERENCES: TailoringPreferences = {
  intensity: 'targeted',
  metricsMode: 'placeholders',
  seniorityLevel: 'senior',
  sectionsToModify: { summary: true, experience: true, skills: true },
};

/** Estimated % of original text changed per intensity level (for UI gauge) */
export const INTENSITY_CHANGE_ESTIMATE: Record<IntensityLevel, string> = {
  minimal: '~10–20%',
  targeted: '~40–60%',
  overhaul: '~85–95%',
};

export const INTENSITY_DESCRIPTIONS: Record<IntensityLevel, { title: string; subtitle: string }> = {
  minimal: {
    title: 'Light Polish',
    subtitle: 'Preserves 85%+ of original phrasing; inserts missing critical keywords only where natural.',
  },
  targeted: {
    title: 'Balanced',
    subtitle: 'Rewrites 3–5 key bullets & summary into Google XYZ impact format (Accomplished X, measured by Y, by Z).',
  },
  overhaul: {
    title: 'Full Overhaul',
    subtitle: 'Rewrites every bullet with executive phrasing while strictly preserving authentic experience ideas and history.',
  },
};

export const METRICS_DESCRIPTIONS: Record<MetricsMode, { title: string; subtitle: string }> = {
  strict: {
    title: 'Keep Original Numbers',
    subtitle: 'Preserves existing metrics only; no new metrics or placeholders added.',
  },
  placeholders: {
    title: 'Smart Placeholders [X%]',
    subtitle: 'Injects editable bracketed markers like [increased efficiency by X%] to guide customization.',
  },
  benchmarks: {
    title: 'Industry KPI Benchmarks',
    subtitle: 'Re-frames accomplishments around standard industry metrics (throughput, scale, uptime, ARR).',
  },
};

export const SENIORITY_DESCRIPTIONS: Record<SeniorityLevel, { title: string; subtitle: string }> = {
  mid: {
    title: 'Mid-Level',
    subtitle: 'Individual contributor, execution, and core technical craft focus.',
  },
  senior: {
    title: 'Senior / Staff',
    subtitle: 'Ownership, architecture, scope, and cross-functional leadership.',
  },
  executive: {
    title: 'Lead / Executive',
    subtitle: 'Strategic impact, organizational efficiency, business ROI, and team scale.',
  },
};
