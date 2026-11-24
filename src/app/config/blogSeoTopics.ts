export interface BlogSeoTopic {
  slugHint: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  pillar: "role-tailoring" | "ats-systems" | "tactical-playbooks" | "comparison-intent";
  searchIntent: string;
  targetInternalLinks: string[];
}

/**
 * Curated high-search-intent SEO topic bank for airesumetailor.com.
 * Each topic targets real Google queries job seekers type when actively applying,
 * paired with internal hub links to build topical authority and drive organic traffic.
 */
export const BLOG_SEO_TOPICS: BlogSeoTopic[] = [
  // Pillar 1: Role-Specific Tailoring
  {
    slugHint: "how-to-tailor-software-engineer-resume-ats",
    primaryKeyword: "how to tailor a software engineer resume",
    secondaryKeywords: ["software engineer ATS keywords", "tech resume bullet examples", "tailor engineering resume"],
    pillar: "role-tailoring",
    searchIntent: "Software engineers applying to competitive roles who need ATS keyword alignment and metric-driven bullets",
    targetInternalLinks: ["/resume-optimizer", "/keywords/software-engineer", "/alternatives/jobscan"],
  },
  {
    slugHint: "project-manager-resume-keywords-ats-guide",
    primaryKeyword: "project manager resume keywords",
    secondaryKeywords: ["PMP resume ATS", "tailor project management resume", "program manager bullet points"],
    pillar: "role-tailoring",
    searchIntent: "Project and program managers looking for exact ATS keywords and scope/budget bullet transformations",
    targetInternalLinks: ["/resume-optimizer", "/keywords/project-manager", "/pricing"],
  },
  {
    slugHint: "product-manager-resume-tailoring-examples",
    primaryKeyword: "product manager resume examples ATS",
    secondaryKeywords: ["PM resume keywords", "product management metrics on resume", "tailor PM resume"],
    pillar: "role-tailoring",
    searchIntent: "Product managers trying to quantify roadmap impact, activation, and ARR growth for ATS screens",
    targetInternalLinks: ["/resume-optimizer", "/keywords/product-manager", "/alternatives/teal"],
  },
  {
    slugHint: "data-analyst-resume-keywords-sql-python",
    primaryKeyword: "data analyst resume keywords",
    secondaryKeywords: ["SQL Python resume bullets", "analytics ATS resume", "tailor data analyst resume"],
    pillar: "role-tailoring",
    searchIntent: "Data analysts aligning technical stacks (SQL, Python, Tableau, Power BI) to job descriptions",
    targetInternalLinks: ["/resume-optimizer", "/keywords/data-analyst", "/alternatives/jobscan"],
  },
  {
    slugHint: "military-to-civilian-resume-translation-guide",
    primaryKeyword: "military to civilian resume translation",
    secondaryKeywords: ["veteran resume ATS", "translate military jargon resume", "defense to corporate resume"],
    pillar: "role-tailoring",
    searchIntent: "Transitioning veterans and defense leaders translating military titles and clearances into civilian corporate keywords",
    targetInternalLinks: ["/resume-optimizer", "/pricing", "/faq"],
  },
  {
    slugHint: "account-executive-saas-sales-resume-metrics",
    primaryKeyword: "account executive resume examples",
    secondaryKeywords: ["SaaS sales resume keywords", "quota attainment resume bullets", "B2B sales ATS resume"],
    pillar: "role-tailoring",
    searchIntent: "Sales professionals showcasing quota attainment, ACV, and pipeline generation for SaaS recruiters",
    targetInternalLinks: ["/resume-optimizer", "/keywords/account-executive", "/pricing"],
  },
  {
    slugHint: "registered-nurse-resume-ats-keywords",
    primaryKeyword: "registered nurse resume keywords",
    secondaryKeywords: ["RN ATS resume format", "clinical skills resume", "nursing resume tailoring"],
    pillar: "role-tailoring",
    searchIntent: "Nurses and healthcare clinicians formatting certifications, EHR systems, and patient-care metrics for hospital ATS",
    targetInternalLinks: ["/resume-optimizer", "/keywords/registered-nurse", "/faq"],
  },
  {
    slugHint: "cybersecurity-analyst-resume-keywords-ats",
    primaryKeyword: "cybersecurity resume keywords",
    secondaryKeywords: ["SOC analyst resume ATS", "security clearance resume", "SIEM compliance resume bullets"],
    pillar: "role-tailoring",
    searchIntent: "Cybersecurity professionals mapping frameworks (NIST, ISO 27001, SOC 2) and tools to job postings",
    targetInternalLinks: ["/resume-optimizer", "/keywords/cybersecurity-analyst", "/alternatives/rezi"],
  },
  {
    slugHint: "operations-supply-chain-manager-resume-guide",
    primaryKeyword: "operations manager resume keywords",
    secondaryKeywords: ["supply chain procurement resume", "logistics ATS resume", "cost reduction resume bullets"],
    pillar: "role-tailoring",
    searchIntent: "Operations, logistics, and procurement leaders highlighting cost savings, vendor SLAs, and throughput",
    targetInternalLinks: ["/resume-optimizer", "/keywords/operations-manager", "/pricing"],
  },
  {
    slugHint: "marketing-manager-resume-keywords-roi",
    primaryKeyword: "marketing manager resume keywords",
    secondaryKeywords: ["digital marketing ATS resume", "growth marketing metrics resume", "SEO PPC resume bullets"],
    pillar: "role-tailoring",
    searchIntent: "Marketers demonstrating CAC, ROAS, pipeline attribution, and funnel conversion metrics",
    targetInternalLinks: ["/resume-optimizer", "/keywords/marketing-manager", "/alternatives/teal"],
  },

  // Pillar 2: ATS-Specific Technical Guides
  {
    slugHint: "workday-ats-resume-formatting-guide",
    primaryKeyword: "Workday ATS resume format",
    secondaryKeywords: ["how Workday parses resumes", "Workday resume tips", "pass Workday ATS"],
    pillar: "ats-systems",
    searchIntent: "Applicants frustrated by Workday auto-fill errors who want a resume layout Workday parses cleanly",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/jobscan", "/faq"],
  },
  {
    slugHint: "greenhouse-ats-resume-tips-recruiters",
    primaryKeyword: "Greenhouse ATS resume tips",
    secondaryKeywords: ["how Greenhouse ranks resumes", "Greenhouse keyword search", "startup ATS resume"],
    pillar: "ats-systems",
    searchIntent: "Tech and startup candidates wanting to understand how recruiters search and filter inside Greenhouse",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/teal", "/pricing"],
  },
  {
    slugHint: "lever-icims-taleo-ats-resume-differences",
    primaryKeyword: "how ATS resume scanners work",
    secondaryKeywords: ["Lever vs Greenhouse ATS", "iCIMS resume parsing", "Taleo ATS formatting"],
    pillar: "ats-systems",
    searchIntent: "Job seekers demystifying how enterprise ATS platforms score, parse, and filter PDF resumes",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/jobscan", "/faq"],
  },
  {
    slugHint: "pdf-vs-docx-resume-for-ats-2026",
    primaryKeyword: "PDF vs Word resume for ATS",
    secondaryKeywords: ["best file format for ATS", "can ATS read PDF resumes", "ATS friendly resume PDF"],
    pillar: "ats-systems",
    searchIntent: "Candidates deciding whether to submit PDF or DOCX and how to ensure selectable text without parsing breaks",
    targetInternalLinks: ["/resume-optimizer", "/faq", "/pricing"],
  },

  // Pillar 3: Tactical Before/After Playbooks
  {
    slugHint: "google-xyz-resume-formula-examples",
    primaryKeyword: "Google XYZ resume formula examples",
    secondaryKeywords: ["accomplished X measured by Y by doing Z", "rewrite resume bullets", "high impact resume bullets"],
    pillar: "tactical-playbooks",
    searchIntent: "Applicants learning how to turn passive duty bullets into quantified Google X-Y-Z achievement statements",
    targetInternalLinks: ["/resume-optimizer", "/pricing", "/alternatives/rezi"],
  },
  {
    slugHint: "how-to-quantify-resume-bullets-without-numbers",
    primaryKeyword: "how to quantify resume bullets without exact numbers",
    secondaryKeywords: ["resume metrics examples", "no numbers on resume", "quantify soft skills resume"],
    pillar: "tactical-playbooks",
    searchIntent: "Professionals who don't have revenue numbers and want honest ways to quantify scope, frequency, and scale",
    targetInternalLinks: ["/resume-optimizer", "/faq", "/pricing"],
  },
  {
    slugHint: "career-change-resume-tailoring-playbook",
    primaryKeyword: "how to write a career change resume",
    secondaryKeywords: ["transferable skills resume", "pivot industries resume ATS", "career transition resume examples"],
    pillar: "tactical-playbooks",
    searchIntent: "Career switchers translating past experience into the exact vocabulary of a new target industry",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/teal", "/pricing"],
  },
  {
    slugHint: "how-to-match-resume-to-job-description",
    primaryKeyword: "how to match resume to job description",
    secondaryKeywords: ["job description keyword matcher", "tailor resume to job posting", "ATS match score"],
    pillar: "tactical-playbooks",
    searchIntent: "High-intent searchers looking for a step-by-step workflow and free tool to match a resume to a JD",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/jobscan", "/pricing"],
  },
  {
    slugHint: "how-many-keywords-should-be-on-a-resume",
    primaryKeyword: "how many keywords should be on a resume",
    secondaryKeywords: ["resume keyword density", "ATS keyword stuffing", "where to put keywords on resume"],
    pillar: "tactical-playbooks",
    searchIntent: "Applicants balancing ATS keyword coverage with natural, human-sounding recruiter readability",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/jobscan", "/faq"],
  },
  {
    slugHint: "why-your-resume-gets-rejected-in-6-seconds",
    primaryKeyword: "why is my resume getting rejected",
    secondaryKeywords: ["no interviews from resume", "ATS auto rejection", "fix resume not getting callbacks"],
    pillar: "tactical-playbooks",
    searchIntent: "Frustrated job seekers getting zero callbacks who need an immediate diagnostic and tailoring workflow",
    targetInternalLinks: ["/resume-optimizer", "/pricing", "/faq"],
  },
  {
    slugHint: "one-page-vs-two-page-resume-ats-rules",
    primaryKeyword: "one page vs two page resume",
    secondaryKeywords: ["ideal resume length", "senior resume 2 pages", "does ATS care about resume length"],
    pillar: "tactical-playbooks",
    searchIntent: "Mid-to-senior professionals deciding whether to trim to 1 page or keep 2 pages for ATS and recruiters",
    targetInternalLinks: ["/resume-optimizer", "/faq", "/pricing"],
  },
  {
    slugHint: "resume-summary-examples-that-pass-ats",
    primaryKeyword: "professional summary examples for resume",
    secondaryKeywords: ["ATS resume summary", "executive summary resume", "tailored resume headline"],
    pillar: "tactical-playbooks",
    searchIntent: "Candidates rewriting generic objective statements into keyword-rich 3-sentence professional summaries",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/resume-io", "/pricing"],
  },

  // Pillar 4: Comparison & Tool Intent
  {
    slugHint: "free-ats-resume-checker-vs-paid-scanners",
    primaryKeyword: "free ATS resume checker",
    secondaryKeywords: ["best free resume scanner", "ATS score checker online", "Jobscan free alternative"],
    pillar: "comparison-intent",
    searchIntent: "Job seekers searching for a genuinely free ATS resume checker without recurring $49/month subscription traps",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/jobscan", "/alternatives/teal", "/pricing"],
  },
  {
    slugHint: "ai-resume-tailoring-without-hallucinations",
    primaryKeyword: "AI resume tailor without making things up",
    secondaryKeywords: ["honest AI resume writer", "ChatGPT resume hallucination", "authentic AI resume tailoring"],
    pillar: "comparison-intent",
    searchIntent: "Skeptical candidates burned by ChatGPT inventing fake metrics who want truthful, grounded AI tailoring",
    targetInternalLinks: ["/resume-optimizer", "/alternatives/rezi", "/faq"],
  },
  {
    slugHint: "resume-builder-without-monthly-subscription",
    primaryKeyword: "resume optimizer no subscription",
    secondaryKeywords: ["one time payment resume tool", "Resume.io alternative no subscription", "Zety alternative free"],
    pillar: "comparison-intent",
    searchIntent: "Applicants tired of auto-renewing resume subscriptions looking for pay-once time passes",
    targetInternalLinks: ["/pricing", "/alternatives/resume-io", "/alternatives/zety", "/resume-optimizer"],
  },
];

/**
 * Selects the next uncovered high-intent SEO topic from the curated bank.
 * Matches against existing slugs and summaries so we never repeat a topic.
 */
export function pickNextSeoTopic(
  existingSlugs: string[],
  existingSummaries: string[]
): BlogSeoTopic | null {
  const slugSet = new Set(existingSlugs.map((s) => s.toLowerCase()));
  const summaryBlob = existingSummaries.join(" ").toLowerCase();

  for (const topic of BLOG_SEO_TOPICS) {
    if (slugSet.has(topic.slugHint.toLowerCase())) continue;
    // Also skip if a very close slug prefix or exact primary keyword already exists
    const alreadyCoveredBySlug = existingSlugs.some((s) =>
      s.toLowerCase().includes(topic.slugHint.toLowerCase())
    );
    if (alreadyCoveredBySlug) continue;
    if (summaryBlob.includes(topic.primaryKeyword.toLowerCase())) continue;
    return topic;
  }

  return null;
}
