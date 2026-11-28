export type DesignTheme = "pomegranate" | "risograph";
export type SitePage =
  | "tailor"
  | "futureproof"
  | "talent"
  | "pricing"
  | "profile"
  | "agents";
export type PersonaKey = "doctor" | "admin";
export type ViewportMode = "desktop" | "mobile";

export interface BulletUpgrade {
  id: string;
  section: string;
  before: string;
  after: string;
  why: string;
  addedKeywords: string[];
  scoreGain: number;
  lineBadge: string;
}

export interface FutureproofTool {
  id: string;
  name: string;
  badge: string;
  category: string;
  oneLiner: string;
  generatedBullet: string;
  scriptQuestion: string;
  script30s: string;
  defaultSelected: boolean;
}

export interface SavedResumeItem {
  id: string;
  roleTitle: string;
  company: string;
  beforeScore: number;
  afterScore: number;
  updatedAt: string;
  aiToolsCount: number;
  status: "Ready" | "Applied" | "Interview";
}

export interface PersonaDataset {
  key: PersonaKey;
  shortLabel: string;
  roleBadge: string;
  publicId: string;
  privateName: string;
  privateEmail: string;
  privateEmployer: string;
  blockedDomainDefault: string;
  targetRole: string;
  targetCompany: string;
  headline: string;
  industry: string;
  yearsExperience: number;
  workMode: "Remote" | "Hybrid" | "On-site";
  region: string;
  compFloor: string;
  baseScore: number;
  keywordsMatched: string[];
  keywordsAdded: string[];
  missingKeywordHint: string;
  sampleResumeSnippet: string;
  sampleJobSnippet: string;
  bullets: BulletUpgrade[];
  futureproofTools: FutureproofTool[];
  anonymizedHighlights: string[];
  coreSkills: string[];
  agentSearchesWeek: number;
  cardViewsWeek: number;
  sampleIntro: {
    company: string;
    domain: string;
    recruiterName: string;
    recruiterEmail: string;
    roleTitle: string;
    compRange: string;
    workMode: string;
    pitch: string;
  };
  savedResumes: SavedResumeItem[];
}

export const PERSONAS: Record<PersonaKey, PersonaDataset> = {
  doctor: {
    key: "doctor",
    shortLabel: "Physician",
    roleBadge: "Healthcare · HIPAA",
    publicId: "cand_8f3a9c",
    privateName: "Dr. Elena Vance, MD",
    privateEmail: "elena.vance@example.com",
    privateEmployer: "Pacific Coast Medical Group",
    blockedDomainDefault: "pacificcoastmed.org",
    targetRole: "Lead Outpatient Physician",
    targetCompany: "Beacon Health Systems",
    headline: "Board-Certified Internal Medicine Physician",
    industry: "Healthcare & Medicine",
    yearsExperience: 7,
    workMode: "Hybrid",
    region: "US — West Coast",
    compFloor: "$245k+",
    baseScore: 58,
    keywordsMatched: [
      "Epic EHR",
      "Internal Medicine",
      "Chronic Care",
      "HIPAA",
      "Telehealth",
      "Value-Based Care",
      "HEDIS Quality",
      "Care Transitions",
    ],
    keywordsAdded: [
      "Nuance DAX Copilot",
      "Ambient Clinical AI",
      "Epic In-Basket AI",
      "HCC Coding Accuracy",
      "Panel Management",
      "Same-Day Access",
    ],
    missingKeywordHint: "Population Health Analytics",
    sampleResumeSnippet:
      "Internal Medicine Physician (2021–Present) — See adult outpatients daily, write visit notes in Epic, manage chronic conditions, and answer MyChart messages.",
    sampleJobSnippet:
      "Lead Outpatient Physician at Beacon Health — Seeking board-certified MD skilled in Epic EHR, value-based HCC coding, ambient clinical AI documentation, and high-touch panel management.",
    bullets: [
      {
        id: "b1",
        section: "Clinical Leadership",
        before:
          "Saw 20+ adult patients each day and wrote notes in Epic for diabetes and blood pressure visits.",
        after:
          "Managed a 520+ adult outpatient panel across chronic disease care, cutting Epic charting time 42% with HIPAA-compliant ambient clinical AI.",
        why: "Adds measurable panel scale (520+), value-based care keywords, and real Epic ambient AI impact while staying under 2 lines.",
        addedKeywords: ["Epic EHR", "Ambient Clinical AI", "Panel Management"],
        scoreGain: 10,
        lineBadge: "2 lines",
      },
      {
        id: "b2",
        section: "Quality & Coding",
        before:
          "Handled follow-up lab results and coordinated specialist referrals with nursing staff.",
        after:
          "Maintained 99% HCC coding accuracy and 94th-percentile HEDIS quality scores while triaging 35+ daily messages via Epic In-Basket AI.",
        why: "Directly mirrors Beacon Health's value-based HCC coding & quality scorecard priorities.",
        addedKeywords: ["HCC Coding Accuracy", "Epic In-Basket AI"],
        scoreGain: 9,
        lineBadge: "2 lines",
      },
      {
        id: "b3",
        section: "Access & Telehealth",
        before:
          "Completed virtual visits for patients who could not come into the clinic in person.",
        after:
          "Expanded hybrid telehealth and same-day access across 4 clinic pods, lifting patient satisfaction to 4.9/5 without extending clinic hours.",
        why: "Connects telehealth experience directly to the role's Hybrid + Same-Day Access criteria.",
        addedKeywords: ["Same-Day Access", "Telehealth"],
        scoreGain: 8,
        lineBadge: "2 lines",
      },
      {
        id: "b4",
        section: "Care Coordination",
        before:
          "Worked with hospital doctors after discharges so patients got follow-up care.",
        after:
          "Led post-discharge care transitions for high-risk geriatric cohorts, cutting 30-day readmissions 18% across two partner hospitals.",
        why: "Quantifies care-transition impact using Google X-Y-Z framing recruiters scan first.",
        addedKeywords: ["Care Transitions", "Value-Based Care"],
        scoreGain: 7,
        lineBadge: "2 lines",
      },
    ],
    futureproofTools: [
      {
        id: "dax",
        name: "Nuance DAX Copilot",
        badge: "HIPAA-Compliant",
        category: "Ambient Scribe",
        oneLiner: "Turns patient conversations into structured Epic SOAP notes automatically.",
        generatedBullet:
          "Streamlined 22+ daily outpatient encounters using Nuance DAX Copilot inside Epic, cutting after-hours charting by 90 minutes/day.",
        scriptQuestion: "How do you use AI in clinical documentation safely?",
        script30s:
          "I use HIPAA-compliant ambient tools like Nuance DAX inside Epic to draft structured SOAP notes during the visit. I always review and verify clinical details before signing—it lets me stay eye-to-eye with patients instead of staring at the keyboard.",
        defaultSelected: true,
      },
      {
        id: "abridge",
        name: "Abridge Clinical AI",
        badge: "Linked Evidence",
        category: "Visit Summaries",
        oneLiner: "Links every generated note line back to the exact visit audio timestamp.",
        generatedBullet:
          "Delivered clear post-visit care summaries with Abridge linked-evidence transcripts, boosting medication adherence follow-through.",
        scriptQuestion: "How do you prevent AI note errors or hallucinations?",
        script30s:
          "Tools with linked evidence like Abridge highlight the exact moment in the conversation each line came from, so auditing a complex medication change takes five seconds before sign-off.",
        defaultSelected: true,
      },
      {
        id: "inbasket",
        name: "Epic In-Basket AI",
        badge: "Native EHR",
        category: "Patient Triage",
        oneLiner: "Drafts empathetic first-pass replies for routine MyChart questions.",
        generatedBullet:
          "Triaged 35+ daily MyChart inquiries with Epic In-Basket AI draft workflows, cutting patient turnaround time under 4 hours.",
        scriptQuestion: "How does AI help your daily inbox workload?",
        script30s:
          "Epic In-Basket AI drafts clear, empathetic responses for routine refill or lab questions. I edit for clinical nuance and personalize every note, which clears my inbox before 5 PM.",
        defaultSelected: true,
      },
      {
        id: "openevidence",
        name: "OpenEvidence",
        badge: "Peer-Reviewed",
        category: "Point-of-Care",
        oneLiner: "Synthesizes NEJM & JAMA guidelines with direct clinical citations.",
        generatedBullet:
          "Verified complex differential pathways at point-of-care using citation-backed OpenEvidence guideline synthesis.",
        scriptQuestion: "Do you use AI for clinical decision support?",
        script30s:
          "Only citation-backed medical tools like OpenEvidence—never general consumer chatbots—and strictly for checking recent NEJM or JAMA updates alongside standard clinical judgment.",
        defaultSelected: false,
      },
    ],
    anonymizedHighlights: [
      "Manages 520+ adult outpatient panel across diabetes, hypertension, and geriatric care at a regional multi-specialty medical group.",
      "Conducts 20–24 daily encounters using HIPAA-compliant ambient clinical documentation (Nuance DAX Copilot) at 99% coding accuracy.",
      "Triages 35+ daily patient portal inquiries using Epic In-Basket AI while coordinating post-discharge care transitions.",
    ],
    coreSkills: [
      "Epic EHR",
      "Outpatient Internal Medicine",
      "Value-Based HCC Coding",
      "HIPAA Compliance",
    ],
    agentSearchesWeek: 14,
    cardViewsWeek: 4,
    sampleIntro: {
      company: "Beacon Health Systems",
      domain: "beaconhealth.org",
      recruiterName: "Marcus Rivera · Clinical Ops + Sourcing Agent",
      recruiterEmail: "m.rivera@beaconhealth.org",
      roleTitle: "Lead Outpatient Internal Medicine Physician",
      compRange: "$265k – $295k + Sign-On",
      workMode: "Hybrid · San Diego",
      pitch:
        "Our sourcing agent matched your verified Epic EHR + Nuance DAX Copilot workflow. We're rolling out ambient clinical AI across 4 clinics and want a physician lead who already uses it smoothly.",
    },
    savedResumes: [
      {
        id: "r1",
        roleTitle: "Lead Outpatient Physician",
        company: "Beacon Health Systems",
        beforeScore: 58,
        afterScore: 92,
        updatedAt: "Today · 2:14 PM",
        aiToolsCount: 3,
        status: "Ready",
      },
      {
        id: "r2",
        roleTitle: "Primary Care Medical Director",
        company: "One Medical",
        beforeScore: 61,
        afterScore: 94,
        updatedAt: "2 days ago",
        aiToolsCount: 3,
        status: "Interview",
      },
      {
        id: "r3",
        roleTitle: "Telehealth Internal Medicine MD",
        company: "Carbon Health",
        beforeScore: 54,
        afterScore: 89,
        updatedAt: "5 days ago",
        aiToolsCount: 2,
        status: "Applied",
      },
    ],
  },

  admin: {
    key: "admin",
    shortLabel: "Exec Assistant",
    roleBadge: "Operations · Enterprise",
    publicId: "cand_4b2e71",
    privateName: "Jordan Blake",
    privateEmail: "jordan.blake@example.com",
    privateEmployer: "Northstar Operations Group",
    blockedDomainDefault: "northstarops.com",
    targetRole: "Executive Business Partner",
    targetCompany: "Lumen Labs",
    headline: "Senior Executive Assistant & Operations Coordinator",
    industry: "Executive Operations",
    yearsExperience: 8,
    workMode: "Remote",
    region: "US — Remote",
    compFloor: "$110k+",
    baseScore: 60,
    keywordsMatched: [
      "C-Suite Calendar",
      "Board Decks",
      "Travel Logistics",
      "Vendor Budgets",
      "Offsite Planning",
      "Cross-Functional Ops",
    ],
    keywordsAdded: [
      "Microsoft 365 Copilot",
      "Claude Enterprise",
      "Notion AI Ops",
      "Executive Briefings",
      "Async Workflow Design",
      "SOC2 Data Hygiene",
    ],
    missingKeywordHint: "OKR Dashboard Reporting",
    sampleResumeSnippet:
      "Senior Executive Assistant (2020–Present) — Managed calendars for 3 VPs, planned quarterly offsites, took notes in leadership meetings, and handled expense reports.",
    sampleJobSnippet:
      "Executive Business Partner at Lumen Labs — Seeking proactive partner to CEO & COO with strong board-deck prep, AI-assisted executive briefings (M365 Copilot / Claude), and remote-first ops.",
    bullets: [
      {
        id: "a1",
        section: "Executive Partnership",
        before:
          "Managed busy calendars and emails for three executives and scheduled board meetings.",
        after:
          "Orchestrated priorities for 3 C-suite leaders across 4 time zones, reclaiming 11 hrs/wk through async scheduling and M365 Copilot inbox triage.",
        why: "Replaces passive duties with measurable executive time saved + modern AI ops fluency.",
        addedKeywords: ["Microsoft 365 Copilot", "Async Workflow Design"],
        scoreGain: 10,
        lineBadge: "2 lines",
      },
      {
        id: "a2",
        section: "Board & Briefings",
        before:
          "Took notes during leadership meetings and sent out summaries afterward.",
        after:
          "Built automated pre-read executive briefings and board-deck syntheses via Claude Enterprise, cutting leadership prep cycles from 2 days to 3 hours.",
        why: "Shows high-leverage business partner impact rather than basic note-taking.",
        addedKeywords: ["Claude Enterprise", "Executive Briefings"],
        scoreGain: 9,
        lineBadge: "2 lines",
      },
      {
        id: "a3",
        section: "Operations & Knowledge",
        before:
          "Kept team files organized and helped onboard new people in the department.",
        after:
          "Designed a searchable Notion AI ops hub for 65+ employees with strict SOC2 data hygiene, slashing repeated leadership questions by 54%.",
        why: "Highlights scalable systems thinking and enterprise security awareness.",
        addedKeywords: ["Notion AI Ops", "SOC2 Data Hygiene"],
        scoreGain: 8,
        lineBadge: "2 lines",
      },
      {
        id: "a4",
        section: "Events & Budgets",
        before:
          "Booked travel and hotels for quarterly company offsites and tracked receipts.",
        after:
          "Delivered 4 annual 50-person executive offsites 14% under $180k budget while maintaining 98% attendee satisfaction.",
        why: "Quantifies budget stewardship and event scale cleanly in 2 lines.",
        addedKeywords: ["Vendor Budgets", "Offsite Planning"],
        scoreGain: 6,
        lineBadge: "2 lines",
      },
    ],
    futureproofTools: [
      {
        id: "copilot",
        name: "Microsoft 365 Copilot",
        badge: "Enterprise Safe",
        category: "Email & Calendar",
        oneLiner: "Summarizes executive email threads and drafts clean follow-up agendas.",
        generatedBullet:
          "Accelerated executive inbox triage and board follow-ups with Microsoft 365 Copilot, recovering 6+ leadership hours weekly.",
        scriptQuestion: "How do you use AI to support a busy CEO?",
        script30s:
          "I use Microsoft 365 Copilot inside our enterprise tenant to condense long stakeholder threads into 3-bullet decision briefs before 8 AM, so my executive only spends energy on real decisions.",
        defaultSelected: true,
      },
      {
        id: "claude",
        name: "Claude Enterprise",
        badge: "Zero-Training",
        category: "Board Briefings",
        oneLiner: "Polishes board memos, tone-matched comms, and quarterly summaries securely.",
        generatedBullet:
          "Prepared concise board pre-reads and quarterly executive memos using Claude Enterprise with zero-retention data controls.",
        scriptQuestion: "How do you protect confidential company info when using AI?",
        script30s:
          "I exclusively use enterprise zero-retention workspaces like Claude Enterprise and strip sensitive payroll or M&A details before drafting structure or tone.",
        defaultSelected: true,
      },
      {
        id: "notion",
        name: "Notion AI Ops",
        badge: "Team Wiki",
        category: "Action Tracking",
        oneLiner: "Turns leadership meeting notes into assigned owners and due dates.",
        generatedBullet:
          "Converted weekly leadership syncs into tracked owner-and-deadline databases with Notion AI, lifting on-time follow-through to 96%.",
        scriptQuestion: "How do you make sure executive action items don't slip?",
        script30s:
          "Right after leadership meetings, Notion AI pulls every commitment into a shared action tracker with owners and dates—then I run a quick 5-minute human audit before sharing.",
        defaultSelected: true,
      },
    ],
    anonymizedHighlights: [
      "Orchestrates C-suite schedules, board decks, and executive briefings across 4 time zones for a 200-person SaaS leadership team.",
      "Reclaimed 11 leadership hours/week by pairing Microsoft 365 Copilot inbox triage with Notion AI action-item tracking.",
      "Delivered 4 quarterly 50-person executive offsites 14% under $180k budget.",
    ],
    coreSkills: [
      "Executive Partnership",
      "Board Deck Prep",
      "M365 Copilot",
      "Notion Ops",
    ],
    agentSearchesWeek: 19,
    cardViewsWeek: 6,
    sampleIntro: {
      company: "Lumen Labs",
      domain: "lumenlabs.ai",
      recruiterName: "Claire Sato · Chief of Staff",
      recruiterEmail: "claire@lumenlabs.ai",
      roleTitle: "Executive Business Partner to CEO & COO",
      compRange: "$125k – $145k + Equity",
      workMode: "Remote (US)",
      pitch:
        "Our talent agent surfaced your verified M365 Copilot + Claude Enterprise board-briefing track record. We're looking for a calm, high-trust partner for our co-founders.",
    },
    savedResumes: [
      {
        id: "a_r1",
        roleTitle: "Executive Business Partner",
        company: "Lumen Labs",
        beforeScore: 60,
        afterScore: 93,
        updatedAt: "Today · 11:40 AM",
        aiToolsCount: 3,
        status: "Ready",
      },
      {
        id: "a_r2",
        roleTitle: "Senior EA to CEO",
        company: "Linearity Co",
        beforeScore: 57,
        afterScore: 91,
        updatedAt: "3 days ago",
        aiToolsCount: 3,
        status: "Interview",
      },
    ],
  },
};

export const PRICING_TIERS = [
  {
    tier: "2D" as const,
    label: "Sprint Pass",
    price: 9,
    duration: "2 days",
    tagline: "For urgent applications this weekend",
    highlights: [
      "Unlimited tailored PDFs for 48 hours",
      "Futureproof AI tools + 30s scripts",
      "Personal LinkedIn Agent Card",
    ],
    popular: false,
  },
  {
    tier: "7D" as const,
    label: "Pro Week",
    price: 19,
    duration: "7 days",
    tagline: "Most chosen for active interview weeks",
    highlights: [
      "Unlimited tailored resumes & exports",
      "Full Futureproof + Timeline Protection",
      "LinkedIn Agent Card + Live Analytics",
    ],
    popular: true,
  },
  {
    tier: "30D" as const,
    label: "Job Search Month",
    price: 29,
    duration: "30 days",
    tagline: "Calm, full-month search coverage",
    highlights: [
      "30 full days of unlimited tailoring",
      "Priority AI Talent Pool visibility",
      "One-time payment — zero auto-renewal",
    ],
    popular: false,
  },
];

export const PRICING_FAQS = [
  {
    q: "Will this auto-renew like a subscription?",
    a: "Never. Every pass is a strict one-time payment. When your 2, 7, or 30 days end, your card is never billed again.",
  },
  {
    q: "What can I try completely free first?",
    a: "You get 2 free full ATS match audits, before/after diff previews, and permanent free access to the anonymous AI Talent Pool.",
  },
  {
    q: "Will Futureproof put 2025 AI tools on old jobs?",
    a: "No. Built-in Timeline Protection only weaves modern AI workflows into recent roles (2023–Present) or a clean Modern Workflows section.",
  },
  {
    q: "Can my current employer find me in the Talent Network?",
    a: "No. Your name, email, and employer are stripped automatically, and you can block your current company's domain in one tap.",
  },
];

export const ROLE_CHIPS = [
  { id: "doctor", label: "Physicians (HIPAA)" },
  { id: "nurse", label: "Nurses" },
  { id: "admin", label: "Exec Assistants" },
  { id: "finance", label: "Finance" },
  { id: "legal", label: "Legal" },
  { id: "teacher", label: "Educators (FERPA)" },
];

export const BOT_QUIPS: Record<DesignTheme, string[]> = {
  pomegranate: [
    "92% match! Ready to ship this resume.",
    "All 4 bullets stay crisp at ≤2 lines!",
    "3 HIPAA-safe AI tools verified.",
    "Zero fluff — pure X-Y-Z impact.",
  ],
  risograph: [
    "Fresh off the press — 92% match.",
    "Concise two-line balance preserved.",
    "Grounded, truthful AI workflows.",
    "Quiet confidence wins interviews.",
  ],
};
