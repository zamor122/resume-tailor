export interface FutureproofHeroVariant {
  key: string;
  badge: string;
  headline: string;
  subheadline: string;
  proofPill: string;
}

export const DEFAULT_FUTUREPROOF_VARIANT: FutureproofHeroVariant = {
  key: "default",
  badge: "FUTUREPROOF · ADD AI TO YOUR RESUME",
  headline: "Add Real AI Experience to Your Resume — Without Sounding Fake",
  subheadline:
    "No AI background? We match real tools used in your exact field and weave them naturally into your existing work history.",
  proofPill: "Real industry tools · Timeline safe · 30-sec interview scripts",
};

export const FUTUREPROOF_VARIANTS: Record<string, FutureproofHeroVariant> = {
  doctor: {
    key: "doctor",
    badge: "FUTUREPROOF FOR PHYSICIANS & CLINICIANS",
    headline: "Add HIPAA-Compliant AI Experience to Your Medical Resume",
    subheadline:
      "Never put generic 'ChatGPT' on a clinical CV. We match real ambient AI scribes (Nuance DAX Copilot, Abridge, Epic In-Basket AI) to your actual patient-care duties.",
    proofPill: "HIPAA-compliant tools · Preserves your real patient volume",
  },
  nurse: {
    key: "nurse",
    badge: "FUTUREPROOF FOR NURSES & CARE TEAMS",
    headline: "Add Real Clinical AI Skills to Your Nursing Resume",
    subheadline:
      "Show hospital recruiters you're ready for modern EHR workflows using HIPAA-safe chart summarization and Epic In-Basket AI — tied directly to your real bedside experience.",
    proofPill: "HIPAA-safe EHR tools · 30-sec interview talking points",
  },
  admin: {
    key: "admin",
    badge: "FUTUREPROOF FOR ADMIN & EXECUTIVE ASSISTANTS",
    headline: "Add Claude Enterprise & Copilot Workflows to Your Admin Resume",
    subheadline:
      "Stand out from hundreds of applicants by weaving real AI tools (Claude Enterprise, Microsoft 365 Copilot, Zapier AI) into your actual calendar, inbox, and board-prep duties.",
    proofPill: "Real enterprise tools · Zero tech jargon · Ready in 30 sec",
  },
  finance: {
    key: "finance",
    badge: "FUTUREPROOF FOR FINANCE & ACCOUNTING",
    headline: "Add Real Finance AI Tools to Your Resume — Credibly",
    subheadline:
      "Weave Microsoft Copilot for Finance, AlphaSense, and automated AP/reconciliation workflows into your real close, variance, and reporting experience.",
    proofPill: "Audit-ready phrasing · Preserves your real metrics",
  },
  legal: {
    key: "legal",
    badge: "FUTUREPROOF FOR ATTORNEYS & PARALEGALS",
    headline: "Add Verified Legal AI Experience to Your Resume",
    subheadline:
      "Match real confidentiality-first legal AI platforms (Harvey AI, Thomson Reuters CoCounsel, Spellbook) directly to your contract, research, and diligence history.",
    proofPill: "Enterprise-privacy legal tools · Interview-ready scripts",
  },
  teacher: {
    key: "teacher",
    badge: "FUTUREPROOF FOR EDUCATORS & TEACHERS",
    headline: "Add FERPA-Safe AI Experience to Your Teaching Resume",
    subheadline:
      "Show districts how you use real educator AI tools (MagicSchool AI, Google Gemini for Education) for lesson differentiation and rubrics — without compromising student privacy.",
    proofPill: "FERPA-aligned tools · Built for real classrooms",
  },
  sales: {
    key: "sales",
    badge: "FUTUREPROOF FOR SALES & MARKETING",
    headline: "Add Real Revenue AI Workflows to Your Resume",
    subheadline:
      "Weave Gong AI, HubSpot Breeze / Salesforce Einstein, and Clay enrichment directly into your real pipeline, discovery, and campaign bullets.",
    proofPill: "Real GTM tools · Keeps your real quota & metrics",
  },
  trades: {
    key: "trades",
    badge: "FUTUREPROOF FOR TRADES & FIELD OPERATIONS",
    headline: "Add Modern Field-Service AI Tools to Your Resume",
    subheadline:
      "Show employers you know modern dispatch, estimating, and safety tech (ServiceTitan AI, Procore Copilot, SafetyCulture AI) — grounded in your real job-site work.",
    proofPill: "Real field-service tools · Timeline safe for career breaks",
  },
};

export function getFutureproofVariant(roleParam?: string | null): FutureproofHeroVariant {
  if (!roleParam) return DEFAULT_FUTUREPROOF_VARIANT;
  const key = roleParam.trim().toLowerCase();
  return FUTUREPROOF_VARIANTS[key] ?? DEFAULT_FUTUREPROOF_VARIANT;
}
