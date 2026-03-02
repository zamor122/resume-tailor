/**
 * PDF template definitions for resume download.
 * Each template has a distinct layout and color treatment; all use standard fonts for ATS.
 */

export type PdfTemplateId =
  | "modern-hybrid"
  | "clean-chronological"
  | "creative-startup"
  | "functional"
  | "one-pager";

export interface PdfTemplate {
  id: PdfTemplateId;
  name: string;
  description: string;
  previewLabel?: string;
}

/** Optional per-template config for PDF output (bullet limits, clusters, etc.). */
export interface PdfTemplateConfig {
  /** clean-chronological: max bullets for first two roles */
  cleanChronologicalMaxBulletsFirst?: number;
  /** clean-chronological: max bullets for next two roles */
  cleanChronologicalMaxBulletsMid?: number;
  /** clean-chronological: max bullets for older roles */
  cleanChronologicalMaxBulletsOld?: number;
  /** modern-hybrid: max key achievement bullets */
  modernHybridKeyAchievementsCount?: number;
  /** modern-hybrid: max bullets for oldest role */
  modernHybridOldestRoleMaxBullets?: number;
  /** one-pager: max bullets per role (except oldest) */
  onePagerMaxBulletsPerRole?: number;
  /** one-pager: whether oldest role is single line only */
  onePagerOldestRoleSingleLine?: boolean;
  /** functional: keyword lists per cluster (cloud, frontend, api) */
  functionalClusterKeywords?: {
    cloud?: string[];
    frontend?: string[];
    api?: string[];
  };
}

const DEFAULT_TEMPLATE_CONFIG: PdfTemplateConfig = {
  cleanChronologicalMaxBulletsFirst: 5,
  cleanChronologicalMaxBulletsMid: 4,
  cleanChronologicalMaxBulletsOld: 3,
  modernHybridKeyAchievementsCount: 4,
  modernHybridOldestRoleMaxBullets: 2,
  onePagerMaxBulletsPerRole: 3,
  onePagerOldestRoleSingleLine: true,
  functionalClusterKeywords: {
    cloud: ["kubernetes", "eks", "ci/cd", "circleci", "terraform", "aws", "deployment", "devops", "docker", "infrastructure", "cloud"],
    frontend: ["react", "typescript", "i18n", "ui", "frontend", "redux", "next.js", "nextjs", "spa", "component"],
    api: ["rest", "graphql", "api", "backend", "microservices", "server", "node", "express"],
  },
};

/** Override defaults per template if needed. Keys are template ids. */
const TEMPLATE_CONFIG_OVERRIDES: Partial<Record<PdfTemplateId, Partial<PdfTemplateConfig>>> = {};

export function getPdfTemplateConfig(templateId: PdfTemplateId): PdfTemplateConfig {
  const overrides = TEMPLATE_CONFIG_OVERRIDES[templateId] ?? {};
  return { ...DEFAULT_TEMPLATE_CONFIG, ...overrides };
}

export const PDF_TEMPLATES: PdfTemplate[] = [
  {
    id: "modern-hybrid",
    name: "Modern Hybrid",
    description:
      "Centered name and contact; Technical Skills grid at top; full-width experience with a thin left accent. Best for specialists (e.g. React Native, AWS) to pass ATS and show expertise first.",
    previewLabel: "Centered header • Skills grid • Full-width experience",
  },
  {
    id: "clean-chronological",
    name: "Clean Reverse-Chronological",
    description:
      "Left-aligned name and contact; thin 1pt section lines; black and slate only. Best for a steady career path and roles at larger companies.",
    previewLabel: "Left-aligned • Thin section lines • Minimal",
  },
  {
    id: "creative-startup",
    name: "Creative / Startup",
    description:
      "30/70 split: left column with tinted background for name, contact, and skills; right column for summary and experience. Best for startups and lead roles.",
    previewLabel: "Sidebar layout • Accent column • Modern",
  },
  {
    id: "functional",
    name: "Functional (Skills-First)",
    description:
      "Centered header; section titles as skill categories with warm accent. Best for career changers or gaps—lead with what you can do.",
    previewLabel: "Skill categories • Warm accent • Structured",
  },
  {
    id: "one-pager",
    name: "Targeted One-Pager",
    description:
      "Compact header (name + contact on one line); dense, monochrome layout; small but readable font. Best for targeted applications focusing on the last 3–4 years.",
    previewLabel: "Compact • Monochrome • One page",
  },
];

export const DEFAULT_PDF_TEMPLATE_ID: PdfTemplateId = "modern-hybrid";

export function getPdfTemplate(id: string): PdfTemplate | undefined {
  return PDF_TEMPLATES.find((t) => t.id === id);
}
