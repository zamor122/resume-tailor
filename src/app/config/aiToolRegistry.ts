import {
  detectIndustryCategory,
  getDomainTaxonomy,
  type IndustryCategory,
} from "@/app/config/domainTaxonomy";

export type ComfortLevel = "everyday" | "automator";

export interface AiToolEntry {
  id: string;
  name: string;
  vendor: string;
  category: IndustryCategory;
  subRoles: string[];
  isIndustryStandard: boolean;
  comfortTier: ComfortLevel;
  complianceBadges: string[];
  introducedYear: number;
  shortDescription: string;
  workflowUseCases: string[];
  examplePhrasing: string;
  interviewTalkingPoint: string;
}

export const AI_TOOL_REGISTRY: AiToolEntry[] = [
  // =========================================================================
  // HEALTHCARE (Physicians, Nurses, Allied Health, Clinical Ops)
  // =========================================================================
  {
    id: "nuance-dax-copilot",
    name: "Nuance DAX Copilot",
    vendor: "Microsoft / Nuance",
    category: "healthcare",
    subRoles: [
      "physician",
      "doctor",
      "md",
      "do",
      "attending",
      "resident",
      "clinician",
      "nurse practitioner",
      "np",
      "physician assistant",
      "pa-c",
      "provider",
    ],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["HIPAA-Compliant", "EHR-Integrated"],
    introducedYear: 2023,
    shortDescription:
      "HIPAA-compliant ambient clinical listening AI that drafts structured SOAP notes directly inside Epic and other EHRs during patient visits.",
    workflowUseCases: [
      "Ambient patient-encounter listening and automated SOAP note generation",
      "Reducing after-hours EHR charting ('pajama time') while preserving clinical accuracy",
      "Reviewing and signing AI-drafted clinical assessments and care plans",
    ],
    examplePhrasing:
      "Adopted HIPAA-compliant ambient clinical documentation (Nuance DAX Copilot) to draft structured EHR encounter notes, reducing after-hours charting while maintaining 100% coding and compliance accuracy.",
    interviewTalkingPoint:
      "I use ambient clinical listening tools like Nuance DAX Copilot to capture patient conversations securely under HIPAA and draft initial SOAP notes in the EHR. I always review and finalize every clinical detail myself, which lets me stay fully present with patients instead of typing during visits and cuts down after-hours charting.",
  },
  {
    id: "abridge-clinical",
    name: "Abridge",
    vendor: "Abridge AI",
    category: "healthcare",
    subRoles: [
      "physician",
      "doctor",
      "md",
      "do",
      "clinician",
      "specialist",
      "cardiologist",
      "internist",
      "nurse practitioner",
      "physician assistant",
    ],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["HIPAA-Compliant", "Linked Evidence"],
    introducedYear: 2023,
    shortDescription:
      "Ambient medical conversation AI that turns clinician-patient visits into structured, auditable clinical notes linked directly to audio timestamps.",
    workflowUseCases: [
      "Capturing multi-problem outpatient and specialty consultations with auditable transcript links",
      "Generating clear after-visit patient summaries in plain language",
      "Accelerating clinical note turnaround time for billing and care continuity",
    ],
    examplePhrasing:
      "Integrated Abridge ambient AI documentation into outpatient visits to generate auditable clinical notes and plain-language patient after-visit summaries.",
    interviewTalkingPoint:
      "Abridge is an ambient clinical AI built specifically for healthcare that drafts structured notes linked back to the exact part of the patient conversation. That traceability makes it fast to verify medical accuracy while improving patient-facing after-visit instructions.",
  },
  {
    id: "epic-inbasket-ai",
    name: "Epic In-Basket & Chart Summary AI",
    vendor: "Epic Systems",
    category: "healthcare",
    subRoles: [
      "nurse",
      "rn",
      "bsn",
      "lpn",
      "physician",
      "doctor",
      "care coordinator",
      "medical assistant",
      "ma",
      "clinical",
    ],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["HIPAA-Compliant", "Native EHR"],
    introducedYear: 2023,
    shortDescription:
      "Native EHR AI tools that summarize longitudinal patient charts before rounds and draft empathetic responses to routine patient portal messages.",
    workflowUseCases: [
      "Synthesizing complex patient histories and recent labs prior to shift handoffs or appointments",
      "Drafting and personalizing patient portal replies for refill and lab-result inquiries",
      "Prioritizing high-acuity In-Basket messages to improve patient response times",
    ],
    examplePhrasing:
      "Utilized EHR-native AI chart summarization and In-Basket drafting tools to accelerate shift handoff preparation and triage routine patient portal inquiries.",
    interviewTalkingPoint:
      "Within the EHR, I leverage native chart-summarization and message-drafting features to quickly review complex histories before seeing a patient and draft clear, empathetic replies to routine portal questions—always applying clinical judgment before sending.",
  },
  {
    id: "nabla-copilot",
    name: "Nabla Copilot",
    vendor: "Nabla",
    category: "healthcare",
    subRoles: [
      "physician",
      "doctor",
      "therapist",
      "psychologist",
      "behavioral health",
      "nurse practitioner",
      "telehealth",
    ],
    isIndustryStandard: false,
    comfortTier: "everyday",
    complianceBadges: ["HIPAA-Compliant", "Zero Audio Storage"],
    introducedYear: 2023,
    shortDescription:
      "Privacy-first ambient AI scribe that generates structured clinical notes in real time without retaining patient audio recordings.",
    workflowUseCases: [
      "Real-time clinical note generation for telehealth and in-person visits",
      "Maintaining strict privacy standards with zero-retention audio processing",
    ],
    examplePhrasing:
      "Streamlined telehealth and clinic documentation using Nabla Copilot ambient AI while upholding strict HIPAA and patient-privacy protocols.",
    interviewTalkingPoint:
      "Nabla is a lightweight ambient scribe that creates structured notes in real time without storing patient audio, which fits well in outpatient and telehealth settings where privacy and speed both matter.",
  },
  {
    id: "uipath-healthcare-ops",
    name: "Healthcare Workflow & Prior-Auth AI",
    vendor: "UiPath / Microsoft Power Automate",
    category: "healthcare",
    subRoles: [
      "healthcare administrator",
      "practice manager",
      "billing",
      "revenue cycle",
      "intake",
      "coordinator",
      "operations",
    ],
    isIndustryStandard: false,
    comfortTier: "automator",
    complianceBadges: ["HIPAA BAA", "SOC2 Type II"],
    introducedYear: 2023,
    shortDescription:
      "AI-assisted document extraction and workflow automation for insurance verification, prior authorizations, and referral intake.",
    workflowUseCases: [
      "Automating referral fax parsing and payer eligibility checks",
      "Flagging missing clinical documentation prior to claim submission",
    ],
    examplePhrasing:
      "Implemented AI-assisted intake and prior-authorization workflow automation to reduce manual referral processing errors and speed up payer turnaround.",
    interviewTalkingPoint:
      "On the administrative side of healthcare, AI document extraction and workflow automation eliminate repetitive copy-pasting for referrals and prior authorizations so staff can focus on exception handling and patient communication.",
  },

  // =========================================================================
  // GENERAL BUSINESS / ADMINISTRATIVE & EXECUTIVE ASSISTANTS
  // =========================================================================
  {
    id: "claude-enterprise-cowork",
    name: "Claude Enterprise / Cowork",
    vendor: "Anthropic",
    category: "general_business",
    subRoles: [
      "administrative assistant",
      "executive assistant",
      "office manager",
      "coordinator",
      "operations",
      "chief of staff",
      "project manager",
      "hr",
      "recruiter",
      "business analyst",
    ],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["SOC2 Type II", "Zero Training on Data"],
    introducedYear: 2024,
    shortDescription:
      "Enterprise AI workspace for drafting executive briefs, synthesizing long documents, organizing SOPs, and coordinating multi-step office workflows.",
    workflowUseCases: [
      "Synthesizing dense reports, vendor proposals, and email threads into crisp executive briefings",
      "Drafting and standardizing SOPs, meeting agendas, and stakeholder communications",
      "Organizing project trackers and recurring administrative workflows with Claude Cowork",
    ],
    examplePhrasing:
      "Leveraged Claude Enterprise and AI workflow tools to synthesize executive briefings, standardize internal SOPs, and accelerate stakeholder correspondence.",
    interviewTalkingPoint:
      "I use Claude Enterprise with strict company data-privacy boundaries to turn raw meeting notes, long vendor docs, and email threads into structured executive briefs and clean SOPs—cutting prep time dramatically while keeping a human review on every deliverable.",
  },
  {
    id: "microsoft-365-copilot",
    name: "Microsoft 365 Copilot",
    vendor: "Microsoft",
    category: "general_business",
    subRoles: [
      "administrative assistant",
      "executive assistant",
      "office manager",
      "coordinator",
      "manager",
      "director",
      "analyst",
      "hr",
      "operations",
    ],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Enterprise Data Protection", "Microsoft 365"],
    introducedYear: 2023,
    shortDescription:
      "AI assistant embedded across Outlook, Teams, Word, Excel, and PowerPoint for inbox triage, meeting action items, and slide/report drafting.",
    workflowUseCases: [
      "Triaging high-volume executive inboxes and drafting priority responses in Outlook",
      "Capturing Teams meeting recaps, decisions, and follow-up action owners automatically",
      "Building executive presentation decks and summarizing Excel trackers",
    ],
    examplePhrasing:
      "Utilized Microsoft 365 Copilot across Outlook, Teams, and Excel to streamline executive inbox triage, automate meeting action-item recaps, and accelerate board deck preparation.",
    interviewTalkingPoint:
      "Because it sits natively inside Outlook, Teams, Word, and Excel under enterprise permissions, Microsoft 365 Copilot lets me summarize long threads, extract action items from Teams calls immediately, and draft first-pass decks or reports in minutes.",
  },
  {
    id: "zapier-ai-automation",
    name: "Zapier AI / Make Workflows",
    vendor: "Zapier / Make",
    category: "general_business",
    subRoles: [
      "administrative assistant",
      "executive assistant",
      "operations",
      "coordinator",
      "office manager",
      "project manager",
      "revops",
    ],
    isIndustryStandard: true,
    comfortTier: "automator",
    complianceBadges: ["SOC2 Type II", "No-Code Automation"],
    introducedYear: 2023,
    shortDescription:
      "No-code AI workflow automation connecting calendars, Slack, email, forms, and spreadsheets to eliminate repetitive scheduling and data entry.",
    workflowUseCases: [
      "Automating meeting scheduling confirmations, intake routing, and follow-up reminders",
      "Routing form submissions and email requests into project trackers with AI categorization",
      "Building no-code status digests for leadership without manual spreadsheet updates",
    ],
    examplePhrasing:
      "Built no-code AI workflows in Zapier to automate calendar coordination, intake triage, and recurring stakeholder follow-ups, eliminating manual administrative bottlenecks.",
    interviewTalkingPoint:
      "I use Zapier AI to connect everyday tools like Gmail/Outlook, calendars, Slack, and trackers—so repetitive tasks like categorizing incoming requests, sending reminders, or logging meeting follow-ups happen automatically with human checkpoints where needed.",
  },
  {
    id: "notion-ai-workspace",
    name: "Notion AI",
    vendor: "Notion",
    category: "general_business",
    subRoles: [
      "administrative assistant",
      "executive assistant",
      "project manager",
      "operations",
      "chief of staff",
      "coordinator",
    ],
    isIndustryStandard: false,
    comfortTier: "everyday",
    complianceBadges: ["SOC2 Type II", "Workspace Q&A"],
    introducedYear: 2023,
    shortDescription:
      "AI-powered knowledge base and wiki assistant for instant team Q&A, structured meeting notes, and onboarding documentation.",
    workflowUseCases: [
      "Maintaining searchable company wikis and onboarding hubs with AI Q&A",
      "Converting raw meeting notes into structured task tables and owner assignments",
    ],
    examplePhrasing:
      "Maintained cross-functional knowledge bases and meeting trackers using Notion AI to standardize documentation and surface instant answers for team members.",
    interviewTalkingPoint:
      "Notion AI turns a static team wiki into a living reference—turning messy meeting notes into structured action tables and letting teammates find policies or project history in seconds.",
  },
  {
    id: "otter-fireflies-meeting-ai",
    name: "Otter.ai / Fireflies.ai",
    vendor: "Otter / Fireflies",
    category: "general_business",
    subRoles: [
      "executive assistant",
      "administrative assistant",
      "project manager",
      "recruiter",
      "hr",
      "account manager",
    ],
    isIndustryStandard: false,
    comfortTier: "everyday",
    complianceBadges: ["SOC2 Type II", "Meeting Intelligence"],
    introducedYear: 2023,
    shortDescription:
      "Automated meeting transcription and action-item extraction that turns leadership syncs into searchable minutes and clear follow-ups.",
    workflowUseCases: [
      "Capturing accurate executive meeting minutes and searchable decision logs",
      "Distributing structured post-meeting action items and deadlines to stakeholders",
    ],
    examplePhrasing:
      "Implemented AI meeting transcription and action-item extraction (Otter.ai) to deliver accurate executive minutes and track cross-functional follow-ups.",
    interviewTalkingPoint:
      "Using meeting-intelligence tools like Otter or Fireflies ensures nothing slips through the cracks in fast-moving executive meetings—I review the AI summary and send clean, owner-assigned action items right after the call.",
  },

  // =========================================================================
  // LEGAL & COMPLIANCE
  // =========================================================================
  {
    id: "harvey-ai",
    name: "Harvey AI",
    vendor: "Harvey",
    category: "legal_compliance",
    subRoles: ["attorney", "lawyer", "counsel", "paralegal", "legal", "compliance"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["SOC2 Type II", "Zero Data Retention"],
    introducedYear: 2023,
    shortDescription:
      "Domain-specific legal AI platform used by law firms and in-house legal teams for contract analysis, due diligence, and regulatory research.",
    workflowUseCases: [
      "Accelerating first-pass contract review, clause comparison, and diligence summaries",
      "Synthesizing multi-jurisdiction regulatory updates and compliance matrices",
    ],
    examplePhrasing:
      "Utilized legal AI workflows (Harvey) to accelerate first-pass contract analysis, diligence summarization, and regulatory comparison under strict attorney review.",
    interviewTalkingPoint:
      "Harvey is built specifically for legal workflows with enterprise confidentiality controls. I treat it as a rapid first-pass research and comparison tool—always verifying every citation and clause against primary sources before advising stakeholders.",
  },
  {
    id: "thomson-reuters-cocounsel",
    name: "Thomson Reuters CoCounsel",
    vendor: "Thomson Reuters",
    category: "legal_compliance",
    subRoles: ["attorney", "lawyer", "paralegal", "litigation", "counsel", "compliance"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Westlaw-Grounded", "Enterprise Privacy"],
    introducedYear: 2023,
    shortDescription:
      "Legal AI assistant grounded in Westlaw and Practical Law for case-law research, deposition prep, and document review.",
    workflowUseCases: [
      "Conducting Westlaw-grounded legal research memos and authority checks",
      "Summarizing discovery sets and preparing witness/deposition timelines",
    ],
    examplePhrasing:
      "Leveraged Thomson Reuters CoCounsel to streamline Westlaw-grounded legal research, document review timelines, and contract policy checks.",
    interviewTalkingPoint:
      "CoCounsel pairs generative AI directly with Westlaw and Practical Law, which reduces hallucination risk and speeds up document review and memo drafting while keeping full citation traceability.",
  },
  {
    id: "spellbook-legal",
    name: "Spellbook",
    vendor: "Rally / Spellbook",
    category: "legal_compliance",
    subRoles: ["contracts", "commercial counsel", "paralegal", "attorney", "procurement"],
    isIndustryStandard: false,
    comfortTier: "automator",
    complianceBadges: ["SOC2 Type II", "MS Word Native"],
    introducedYear: 2023,
    shortDescription:
      "AI contract drafting and redlining assistant embedded directly inside Microsoft Word to flag missing clauses and playbook deviations.",
    workflowUseCases: [
      "Checking vendor agreements against internal legal playbooks inside Microsoft Word",
      "Flagging aggressive indemnity, liability, or renewal terms during redlining",
    ],
    examplePhrasing:
      "Accelerated commercial contract redlining in Microsoft Word using Spellbook AI to flag playbook deviations and missing risk clauses.",
    interviewTalkingPoint:
      "Spellbook runs right inside Word and compares incoming third-party paper against our standard playbook, flagging non-standard clauses immediately so commercial reviews move faster.",
  },

  // =========================================================================
  // FINANCE & ACCOUNTING
  // =========================================================================
  {
    id: "copilot-for-finance",
    name: "Microsoft Copilot for Finance",
    vendor: "Microsoft",
    category: "finance_accounting",
    subRoles: [
      "accountant",
      "cpa",
      "fp&a",
      "financial analyst",
      "controller",
      "finance",
      "auditor",
      "bookkeeper",
    ],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Enterprise Data Protection", "Excel & ERP Native"],
    introducedYear: 2024,
    shortDescription:
      "Finance-specific AI inside Excel and Outlook that automates variance analysis, data reconciliation, and executive financial commentary.",
    workflowUseCases: [
      "Running automated Excel reconciliation checks and flagging period-over-period variances",
      "Drafting concise monthly close commentary and stakeholder variance explanations",
    ],
    examplePhrasing:
      "Applied Microsoft Copilot for Finance in Excel to streamline monthly variance analysis, reconcile multi-source ledgers, and draft executive close summaries.",
    interviewTalkingPoint:
      "Copilot for Finance works natively inside Excel to surface variance drivers and reconciliation mismatches quickly—freeing up close-cycle time for deeper analysis while I verify all figures against the GL.",
  },
  {
    id: "alphasense-ai",
    name: "AlphaSense AI",
    vendor: "AlphaSense",
    category: "finance_accounting",
    subRoles: ["financial analyst", "investment", "equity", "fp&a", "strategy", "banking"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Citation-Backed", "SEC & Broker Filings"],
    introducedYear: 2023,
    shortDescription:
      "Market intelligence AI that synthesizes SEC filings, earnings transcripts, and broker research with clickable source citations.",
    workflowUseCases: [
      "Extracting peer benchmarking metrics and management guidance across earnings transcripts",
      "Building citation-backed market and competitor briefs for leadership",
    ],
    examplePhrasing:
      "Used AlphaSense AI to synthesize SEC filings, earnings call transcripts, and peer benchmarks into citation-backed executive memos.",
    interviewTalkingPoint:
      "AlphaSense lets me query across earnings calls and SEC filings and jumps straight to the exact source snippet, which makes competitive benchmarking both faster and fully auditable.",
  },
  {
    id: "ramp-vic-ai-ap",
    name: "Ramp Intelligence / Vic.ai",
    vendor: "Ramp / Vic.ai",
    category: "finance_accounting",
    subRoles: ["accountant", "ap", "ar", "controller", "bookkeeper", "finance operations"],
    isIndustryStandard: false,
    comfortTier: "automator",
    complianceBadges: ["SOC2 Type II", "ERP Sync"],
    introducedYear: 2023,
    shortDescription:
      "Autonomous AP invoice coding, duplicate detection, and spend-policy enforcement synced with NetSuite and QuickBooks.",
    workflowUseCases: [
      "Automating GL coding, receipt matching, and policy-exception flagging",
      "Shortening month-end close by eliminating manual invoice data entry",
    ],
    examplePhrasing:
      "Streamlined accounts payable and spend controls using AI-assisted GL coding and anomaly detection (Ramp Intelligence / Vic.ai) synced to the ERP.",
    interviewTalkingPoint:
      "AI-driven AP tools handle routine invoice coding and flag duplicate or out-of-policy spend automatically, so accounting teams can focus on audit controls and cash-flow forecasting.",
  },

  // =========================================================================
  // SALES & MARKETING
  // =========================================================================
  {
    id: "gong-ai",
    name: "Gong Revenue AI",
    vendor: "Gong",
    category: "sales_marketing",
    subRoles: ["account executive", "ae", "sales", "sdr", "bdr", "revenue", "customer success"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["SOC2 Type II", "CRM Sync"],
    introducedYear: 2023,
    shortDescription:
      "Revenue intelligence AI that analyzes sales calls, flags deal risks, drafts follow-up emails, and syncs MEDDPICC fields to the CRM.",
    workflowUseCases: [
      "Extracting buyer objections, next steps, and deal-risk signals from discovery calls",
      "Automating CRM note hygiene and tailored post-call executive recaps",
    ],
    examplePhrasing:
      "Leveraged Gong Revenue AI to analyze discovery calls, surface deal-risk signals early, and automate CRM hygiene and tailored buyer follow-ups.",
    interviewTalkingPoint:
      "I use Gong AI to review objection patterns across my pipeline, keep CRM fields accurate without hours of manual logging, and send sharper, context-rich follow-ups right after discovery calls.",
  },
  {
    id: "hubspot-breeze-ai",
    name: "HubSpot Breeze AI / Salesforce Einstein",
    vendor: "HubSpot / Salesforce",
    category: "sales_marketing",
    subRoles: ["marketing", "demand gen", "growth", "sales", "crm", "revops", "content"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["CRM Native", "Enterprise Privacy"],
    introducedYear: 2024,
    shortDescription:
      "CRM-native AI for lead scoring, campaign copy adaptation, audience segmentation, and pipeline forecasting.",
    workflowUseCases: [
      "Prioritizing inbound leads with predictive scoring and automated account enrichment",
      "Repurposing core campaign messaging across email, landing pages, and social channels",
    ],
    examplePhrasing:
      "Applied CRM-native AI (HubSpot Breeze / Salesforce Einstein) to enrich target accounts, prioritize high-intent leads, and scale multi-channel campaign execution.",
    interviewTalkingPoint:
      "Using AI directly inside the CRM means lead prioritization, account research, and campaign personalization stay tied to real funnel data instead of disconnected spreadsheets.",
  },
  {
    id: "clay-gtm-ai",
    name: "Clay AI Enrichment",
    vendor: "Clay",
    category: "sales_marketing",
    subRoles: ["sdr", "bdr", "growth", "demand gen", "revops", "marketing", "outbound"],
    isIndustryStandard: false,
    comfortTier: "automator",
    complianceBadges: ["GTM Automation", "Multi-Source Enrichment"],
    introducedYear: 2023,
    shortDescription:
      "AI research agent and data-enrichment workflow tool that researches target accounts and personalizes outbound messaging at scale.",
    workflowUseCases: [
      "Building automated account-research waterfalls (hiring signals, tech stack, news triggers)",
      "Generating hyper-relevant outbound personalization grounded in real company signals",
    ],
    examplePhrasing:
      "Built automated account-enrichment and signal-based outbound workflows in Clay to personalize prospect outreach using live hiring and funding triggers.",
    interviewTalkingPoint:
      "Clay lets me combine data enrichment with an AI research agent to spot real buying signals—like new job postings or product launches—so outreach feels researched rather than spammy.",
  },

  // =========================================================================
  // OPERATIONS & LOGISTICS
  // =========================================================================
  {
    id: "power-automate-copilot",
    name: "Microsoft Power Automate & Copilot",
    vendor: "Microsoft",
    category: "operations_logistics",
    subRoles: ["operations", "supply chain", "logistics", "warehouse", "inventory", "planner", "procurement"],
    isIndustryStandard: true,
    comfortTier: "automator",
    complianceBadges: ["Enterprise SOC2", "ERP / Excel Ready"],
    introducedYear: 2023,
    shortDescription:
      "AI-assisted workflow automation for vendor alerts, inventory exception routing, purchase-order approvals, and KPI reporting.",
    workflowUseCases: [
      "Automating shipment-delay alerts, PO approval routing, and daily ops exception reports",
      "Extracting structured line items from vendor packing slips and invoices",
    ],
    examplePhrasing:
      "Deployed AI-assisted Power Automate workflows to parse vendor documentation, route shipment-delay exceptions, and automate daily operational KPI reporting.",
    interviewTalkingPoint:
      "In operations, small delays compound fast. I use Power Automate with AI document parsing to catch vendor exceptions early and automate routine reporting so the team focuses on resolving bottlenecks.",
  },
  {
    id: "supply-chain-visibility-ai",
    name: "Project44 / SAP Joule Supply Chain AI",
    vendor: "Project44 / SAP",
    category: "operations_logistics",
    subRoles: ["supply chain", "logistics", "freight", "transportation", "inventory", "distribution"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Predictive ETA", "ERP-Integrated"],
    introducedYear: 2023,
    shortDescription:
      "Predictive transit ETA and supply-chain copilot tools that flag carrier disruptions early and recommend inventory re-allocation.",
    workflowUseCases: [
      "Monitoring predictive carrier ETAs to proactively re-route at-risk shipments",
      "Querying ERP inventory and supplier lead-time anomalies in natural language",
    ],
    examplePhrasing:
      "Utilized predictive supply-chain visibility AI to flag carrier delays ahead of schedule and coordinate proactive rerouting with warehouse and vendor partners.",
    interviewTalkingPoint:
      "Predictive visibility tools give us early warning on port or carrier delays instead of finding out after a missed delivery window, letting us communicate proactively with customers and adjust inventory.",
  },

  // =========================================================================
  // EDUCATION & COACHING
  // =========================================================================
  {
    id: "magicschool-ai",
    name: "MagicSchool AI",
    vendor: "MagicSchool",
    category: "education_coaching",
    subRoles: ["teacher", "educator", "professor", "instructor", "curriculum", "instructional", "tutor", "special education"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["FERPA-Aligned", "COPPA-Compliant"],
    introducedYear: 2023,
    shortDescription:
      "FERPA-aligned educator AI platform for differentiating lesson plans, scaffolding reading levels, building rubrics, and drafting IEP accommodations.",
    workflowUseCases: [
      "Differentiating reading passages and lesson scaffolds across multiple grade/proficiency levels",
      "Drafting standards-aligned rubrics, formative quizzes, and family communication templates",
    ],
    examplePhrasing:
      "Integrated FERPA-aligned instructional AI (MagicSchool AI) to differentiate lesson materials across reading levels and streamline standards-aligned rubric creation.",
    interviewTalkingPoint:
      "MagicSchool AI is built specifically for educators with student-privacy guardrails. I use it to quickly adapt reading levels and build scaffolded practice materials without entering student PII, giving me more time for one-on-one instruction.",
  },
  {
    id: "gemini-for-education",
    name: "Google Gemini for Education",
    vendor: "Google Workspace for Education",
    category: "education_coaching",
    subRoles: ["teacher", "educator", "administrator", "instructional designer", "trainer", "professor"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["FERPA / Workspace Privacy", "Google Classroom"],
    introducedYear: 2024,
    shortDescription:
      "Privacy-protected AI built into Google Docs, Slides, and Classroom for curriculum planning, formative feedback, and administrative communication.",
    workflowUseCases: [
      "Drafting unit outlines, study guides, and parent newsletters directly in Google Workspace",
      "Organizing curriculum standards and instructional pacing calendars",
    ],
    examplePhrasing:
      "Utilized Google Gemini for Education within Google Workspace to streamline unit planning, create accessible study guides, and improve family communication turnaround.",
    interviewTalkingPoint:
      "Because it runs inside Google Workspace for Education with enterprise data protection, Gemini helps me draft study guides and adapt classroom materials quickly while keeping student information protected.",
  },

  // =========================================================================
  // TECHNOLOGY & ENGINEERING
  // =========================================================================
  {
    id: "github-copilot-cursor",
    name: "GitHub Copilot / Cursor",
    vendor: "GitHub / Anysphere",
    category: "technology_engineering",
    subRoles: ["engineer", "developer", "programmer", "architect", "devops", "qa", "sre", "data"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["SOC2 Type II", "Zero Code Retention"],
    introducedYear: 2023,
    shortDescription:
      "AI pair-programming and codebase-aware IDE assistants for test generation, refactoring, documentation, and faster PR iteration.",
    workflowUseCases: [
      "Accelerating unit-test coverage, boilerplate generation, and legacy code refactoring",
      "Reviewing unfamiliar modules and drafting technical documentation alongside code changes",
    ],
    examplePhrasing:
      "Adopted AI-assisted development workflows (GitHub Copilot / Cursor) to accelerate unit-test generation, legacy refactoring, and PR review turnaround while upholding strict code quality standards.",
    interviewTalkingPoint:
      "I use Copilot and Cursor as force multipliers for scaffolding tests, navigating large codebases, and handling repetitive refactors—while owning architecture decisions, security review, and edge-case verification myself.",
  },
  {
    id: "claude-code-ai-review",
    name: "Claude Code & Automated PR Review",
    vendor: "Anthropic",
    category: "technology_engineering",
    subRoles: ["engineer", "developer", "staff", "lead", "devops", "security", "qa"],
    isIndustryStandard: true,
    comfortTier: "automator",
    complianceBadges: ["Enterprise API", "CI/CD Ready"],
    introducedYear: 2025,
    shortDescription:
      "Agentic CLI and CI/CD coding assistant for multi-file migrations, automated test-failure diagnosis, and security/regression PR checks.",
    workflowUseCases: [
      "Running automated root-cause analysis on failing builds and multi-file dependency migrations",
      "Enforcing automated PR security and regression checklists in CI pipelines",
    ],
    examplePhrasing:
      "Integrated agentic engineering workflows (Claude Code) for multi-file refactoring, automated test triage, and repeatable PR quality checks.",
    interviewTalkingPoint:
      "Agentic coding tools like Claude Code are especially effective for bounded, verifiable tasks like migrations, test triage, and pre-merge audits—always gated by automated test suites and human code review.",
  },

  // =========================================================================
  // HOSPITALITY & SERVICE
  // =========================================================================
  {
    id: "toast-iq-sevenrooms",
    name: "Toast IQ / SevenRooms AI",
    vendor: "Toast / SevenRooms",
    category: "hospitality_service",
    subRoles: ["restaurant", "hospitality", "manager", "hotel", "guest", "server", "bar", "event", "catering"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Hospitality POS Native"],
    introducedYear: 2024,
    shortDescription:
      "Hospitality AI built into POS and reservation platforms for demand forecasting, VIP guest recognition, and menu/upsell optimization.",
    workflowUseCases: [
      "Forecasting peak cover volumes to optimize prep lists and reduce food waste",
      "Personalizing VIP guest notes and automated post-visit review follow-ups",
    ],
    examplePhrasing:
      "Leveraged hospitality AI analytics (Toast IQ / SevenRooms) to forecast shift demand, personalize VIP guest experiences, and reduce over-prep waste.",
    interviewTalkingPoint:
      "Modern hospitality POS platforms use AI to turn historical cover and weather data into sharper prep and staffing forecasts, while surfacing VIP preferences so front-of-house teams deliver warmer service.",
  },
  {
    id: "canary-7shifts-ai",
    name: "Canary AI / 7shifts Labor AI",
    vendor: "Canary Technologies / 7shifts",
    category: "hospitality_service",
    subRoles: ["hotel", "front desk", "concierge", "restaurant", "hospitality", "shift manager", "general manager"],
    isIndustryStandard: true,
    comfortTier: "automator",
    complianceBadges: ["Guest Messaging", "Labor Compliance"],
    introducedYear: 2023,
    shortDescription:
      "AI guest messaging and smart shift-scheduling tools that answer routine guest inquiries 24/7 and balance labor costs with demand.",
    workflowUseCases: [
      "Automating routine guest check-in, amenity, and upsell messaging via SMS/web",
      "Building demand-matched shift schedules that respect labor budgets and staff availability",
    ],
    examplePhrasing:
      "Implemented AI-assisted shift scheduling and guest messaging workflows (7shifts / Canary AI) to improve guest response times and maintain target labor percentages.",
    interviewTalkingPoint:
      "Tools like Canary and 7shifts automate repetitive guest FAQs and align shift schedules with forecasted traffic, freeing managers to coach staff and handle high-touch guest situations.",
  },

  // =========================================================================
  // TRADES & FACILITIES
  // =========================================================================
  {
    id: "servicetitan-ai",
    name: "ServiceTitan AI Dispatch & Pro",
    vendor: "ServiceTitan",
    category: "trades_facilities",
    subRoles: ["hvac", "plumbing", "electrical", "technician", "dispatcher", "field service", "contractor", "maintenance"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Field Service Standard"],
    introducedYear: 2023,
    shortDescription:
      "Field-service AI that optimizes technician routing, summarizes inbound service calls, and streamlines job estimates in the field.",
    workflowUseCases: [
      "Optimizing daily technician dispatch routes based on job urgency, skill match, and drive time",
      "Converting field inspection notes into clear customer repair estimates and follow-up quotes",
    ],
    examplePhrasing:
      "Utilized ServiceTitan AI dispatch and call-summary tools to optimize technician routing, accelerate on-site repair estimates, and improve first-time fix rates.",
    interviewTalkingPoint:
      "ServiceTitan's AI tools help dispatchers match the right tech to the right job with less windshield time and summarize call details so technicians arrive prepared.",
  },
  {
    id: "procore-safetyculture-ai",
    name: "Procore Copilot / SafetyCulture AI",
    vendor: "Procore / SafetyCulture",
    category: "trades_facilities",
    subRoles: ["construction", "superintendent", "project manager", "facilities", "safety", "foreman", "estimator"],
    isIndustryStandard: true,
    comfortTier: "automator",
    complianceBadges: ["OSHA / Safety Logs", "Field Mobile"],
    introducedYear: 2024,
    shortDescription:
      "Construction and facilities AI for daily field logs, RFI/submittal tracking, and automated OSHA safety inspection checklists.",
    workflowUseCases: [
      "Summarizing daily field logs, RFIs, and punch-list items across active job sites",
      "Generating standardized safety inspection checklists and photo-documented hazard reports",
    ],
    examplePhrasing:
      "Streamlined field reporting and OSHA safety audits using Procore Copilot and SafetyCulture AI to track RFIs, daily logs, and hazard follow-ups.",
    interviewTalkingPoint:
      "Procore Copilot and SafetyCulture AI cut down paperwork on the job site—turning voice/mobile notes into structured daily logs and safety checklists so nothing gets missed during inspections.",
  },

  // =========================================================================
  // AVIATION & AEROSPACE
  // =========================================================================
  {
    id: "foreflight-ops-ai",
    name: "ForeFlight / Predictive Flight Ops Analytics",
    vendor: "Boeing / ForeFlight",
    category: "aviation_aerospace",
    subRoles: ["pilot", "dispatcher", "aviation", "flight", "maintenance", "a&p", "aerospace"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["FAA-Aligned Workflows"],
    introducedYear: 2023,
    shortDescription:
      "AI-enhanced flight-planning, weather-hazard synthesis, and predictive maintenance analytics for safer, more fuel-efficient operations.",
    workflowUseCases: [
      "Synthesizing NOTAMs, weather briefings, and fuel-optimal routing options",
      "Reviewing predictive maintenance alerts to prevent unscheduled AOG events",
    ],
    examplePhrasing:
      "Utilized modern flight-ops analytics and automated NOTAM/weather synthesis tools to support fuel-efficient routing and proactive maintenance coordination.",
    interviewTalkingPoint:
      "In aviation, AI is strictly decision-support—synthesizing NOTAMs, weather trends, or predictive maintenance indicators so pilots, dispatchers, and technicians make faster, better-informed safety calls.",
  },
  {
    id: "aviation-copilot-compliance",
    name: "Microsoft 365 Copilot (Ops & Compliance)",
    vendor: "Microsoft",
    category: "aviation_aerospace",
    subRoles: ["aviation", "aerospace", "safety", "quality", "compliance", "operations", "program manager"],
    isIndustryStandard: true,
    comfortTier: "everyday",
    complianceBadges: ["Enterprise Data Protection"],
    introducedYear: 2023,
    shortDescription:
      "Enterprise AI for summarizing safety/quality audit documentation, SOP revisions, and cross-team operational briefings.",
    workflowUseCases: [
      "Drafting and cross-checking SOP updates and safety audit summaries",
      "Synthesizing operational shift turnovers and stakeholder reports",
    ],
    examplePhrasing:
      "Applied enterprise AI documentation tools (Microsoft 365 Copilot) to accelerate safety-audit summaries, SOP revision tracking, and operational shift briefings.",
    interviewTalkingPoint:
      "For documentation-heavy aviation operations, enterprise AI helps summarize audit findings and track SOP revisions accurately under strict human verification.",
  },
];

/**
 * Determine whether a role date range overlaps with the modern AI era (2023–Present).
 * Prevents fabricating modern AI tools onto older historical roles (e.g., 2016–2019).
 */
export function isRoleRecentForAi(dateRange?: string | null): boolean {
  if (!dateRange || !dateRange.trim()) return true;
  const lower = dateRange.toLowerCase();
  if (/(present|current|now|ongoing|today)/.test(lower)) return true;

  const years = dateRange.match(/\b(19|20)\d{2}\b/g);
  if (!years || years.length === 0) return true;

  const maxYear = Math.max(...years.map((y) => parseInt(y, 10)));
  return maxYear >= 2023;
}

export function detectFutureproofIndustry(resumeText: string): IndustryCategory {
  const lower = resumeText.toLowerCase();
  const hasClinicalSignals =
    /\b(patient|patients|clinical|hospital|ehr|epic|hipaa|rn|bsn|physician|doctor|md|nurse|pharmacy|medical center)\b/.test(
      lower
    );
  const hasAdminSignals =
    /\b(administrative assistant|executive assistant|office manager|chief of staff|receptionist|executive support)\b/.test(
      lower
    );

  // Prevent words like "inbox triage" on an Admin/EA resume from misclassifying as healthcare
  if (hasAdminSignals && !hasClinicalSignals) {
    return "general_business";
  }

  return detectIndustryCategory("", resumeText);
}

/**
 * Score and return 4-6 curated, real industry-standard AI tools matched to the user's
 * detected industry, resume text (sub-role keywords), and comfort tier.
 */
export function getRecommendedToolsForResume(params: {
  resumeText: string;
  industry?: IndustryCategory;
  comfortLevel?: ComfortLevel;
  limit?: number;
}): {
  industry: IndustryCategory;
  industryDisplayName: string;
  tools: Array<AiToolEntry & { preselected: boolean }>;
} {
  const { resumeText, comfortLevel = "everyday", limit = 6 } = params;
  const industry = params.industry ?? detectFutureproofIndustry(resumeText);
  const taxonomy = getDomainTaxonomy(industry);
  const lowerResume = resumeText.toLowerCase();

  // Primary pool: tools in the detected industry
  const primaryPool = AI_TOOL_REGISTRY.filter((t) => t.category === industry);

  // Secondary fallback pool: universal general_business productivity tools (e.g., M365 Copilot, Claude Enterprise)
  // if the industry pool has fewer than 4 tools.
  const secondaryPool =
    industry === "general_business"
      ? []
      : AI_TOOL_REGISTRY.filter(
          (t) =>
            t.category === "general_business" &&
            (t.id === "microsoft-365-copilot" ||
              t.id === "claude-enterprise-cowork" ||
              t.id === "zapier-ai-automation")
        );

  const scoreTool = (tool: AiToolEntry, isPrimary: boolean): number => {
    let score = isPrimary ? 100 : 20;
    if (tool.isIndustryStandard) score += 25;
    if (tool.comfortTier === comfortLevel) score += 15;

    // Sub-role keyword hits from resume text
    let subRoleHits = 0;
    for (const sr of tool.subRoles) {
      if (lowerResume.includes(sr.toLowerCase())) {
        subRoleHits += 1;
      }
    }
    score += Math.min(subRoleHits, 3) * 18;
    return score;
  };

  const combined = [
    ...primaryPool.map((tool) => ({ tool, score: scoreTool(tool, true) })),
    ...secondaryPool.map((tool) => ({ tool, score: scoreTool(tool, false) })),
  ].sort((a, b) => b.score - a.score);

  const topTools = combined.slice(0, limit).map((item) => item.tool);

  // Pre-select the top 2 industry-standard tools (or top 2 overall if fewer standards exist)
  let preselectedCount = 0;
  const tools = topTools.map((tool) => {
    const shouldPreselect =
      preselectedCount < 2 &&
      (tool.isIndustryStandard || topTools.indexOf(tool) < 2);
    if (shouldPreselect) preselectedCount += 1;
    return {
      ...tool,
      preselected: shouldPreselect,
    };
  });

  return {
    industry,
    industryDisplayName: taxonomy.displayName,
    tools,
  };
}

/**
 * Resolve a list of tool IDs strictly against the verified AI_TOOL_REGISTRY.
 * If `useIndustryStandards` is true or no valid IDs are provided, auto-selects
 * the top 2-3 industry-standard tools for the user's resume & industry.
 */
export function resolveVerifiedTools(params: {
  resumeText: string;
  industry?: IndustryCategory;
  selectedToolIds?: string[];
  useIndustryStandards?: boolean;
  comfortLevel?: ComfortLevel;
}): {
  industry: IndustryCategory;
  industryDisplayName: string;
  tools: AiToolEntry[];
} {
  const {
    resumeText,
    industry,
    selectedToolIds = [],
    useIndustryStandards = false,
    comfortLevel = "everyday",
  } = params;

  const recommended = getRecommendedToolsForResume({
    resumeText,
    industry,
    comfortLevel,
    limit: 6,
  });

  if (!useIndustryStandards && selectedToolIds.length > 0) {
    const byId = new Map(AI_TOOL_REGISTRY.map((t) => [t.id, t]));
    const verified = selectedToolIds
      .map((id) => byId.get(id))
      .filter((t): t is AiToolEntry => Boolean(t))
      .slice(0, 5);

    if (verified.length > 0) {
      return {
        industry: recommended.industry,
        industryDisplayName: recommended.industryDisplayName,
        tools: verified,
      };
    }
  }

  // "Unsure? Pick Industry Standards" fallback: top 2-3 preselected industry-standard tools
  const standardTools = recommended.tools
    .filter((t) => t.preselected || t.isIndustryStandard)
    .slice(0, 3)
    .map(({ preselected: _p, ...tool }) => tool);

  return {
    industry: recommended.industry,
    industryDisplayName: recommended.industryDisplayName,
    tools: standardTools.length > 0 ? standardTools : recommended.tools.slice(0, 2),
  };
}
