export type SeniorityTier = "entry" | "mid" | "senior" | "lead_manager" | "executive";

/**
 * Classifies a candidate or target role into one of 5 universal seniority tiers (REQ-UBI-01, REQ-EVT-01).
 * Inspects job title first, followed by semantic markers in the job description.
 */
export function classifySeniorityTier(title: string = "", jd: string = ""): SeniorityTier {
  const safeTitle = (title || "").toLowerCase();
  const safeJd = (jd || "").slice(0, 1500).toLowerCase();
  const combined = `${safeTitle} ${safeJd}`.trim();

  // Exclude sales IC titles ("account executive") and administrative support ("executive assistant")
  const isExcludedExecutive = /\b(account executive|executive assistant)\b/i.test(safeTitle);

  // 1. Executive / Director / VP / Head / Principal
  if (!isExcludedExecutive && /\b(vp|vice president|c-level|chief|director|head of|executive|partner|general manager)\b/i.test(safeTitle)) {
    return "executive";
  }
  if (!isExcludedExecutive && /\b(executive leadership|p&l responsibility|organizational strategy|board of directors)\b/i.test(combined)) {
    return "executive";
  }

  // 2. Lead / Manager / Supervisor
  if (/\b(manager|lead|supervisor|team lead|principal|head)\b/i.test(safeTitle)) {
    return "lead_manager";
  }
  if (/\b(manage a team|direct reports|people management|team leadership)\b/i.test(combined)) {
    return "lead_manager";
  }

  // 3. Senior
  // Exclude non-tech "staff" titles (e.g. staff nurse, staff accountant, staff writer, staff assistant)
  // where "staff" denotes a general employee / IC role rather than tech seniority
  const isNonTechStaff = /\bstaff\s+(nurse|rn|accountant|writer|assistant|attorney|pharmacist|therapist|educator)\b/i.test(safeTitle);

  if (/\b(senior|sr\.?|advanced)\b/i.test(safeTitle)) {
    return "senior";
  }
  if (!isNonTechStaff && /\bstaff\b/i.test(safeTitle)) {
    return "senior";
  }
  if (/\b(senior-level|strategic decision|cross-functional initiative|mentorship)\b/i.test(combined)) {
    return "senior";
  }

  // 4. Entry / Associate / Junior / Intern
  if (/\b(junior|jr\.?|associate|entry|intern|assistant|coordinator)\b/i.test(safeTitle)) {
    return "entry";
  }

  return "mid";
}

/**
 * Extracts 2 to 4 domain-agnostic success pillars from the job description text (REQ-UBI-01, REQ-EVT-01).
 * Covers healthcare, sales, finance, operations, engineering, and general management.
 */
export function extractSuccessPillars(jd: string = "", title?: string): string[] {
  if (!jd || typeof jd !== "string" || jd.trim().length === 0) {
    return ["Operational Excellence", "Stakeholder Delivery"];
  }

  const pillars: string[] = [];
  const jdLower = `${title ? title + " " : ""}${jd}`.toLowerCase();

  // Healthcare / Clinical
  if (/\b(patient care|clinical|triage|nursing|healthcare|acuity)\b/i.test(jdLower)) {
    pillars.push("Patient Care & Clinical Excellence");
  }

  // Compliance & Regulatory (distinguish clinical vs general/corporate)
  if (/\b(compliance|jcaho|hipaa|regulatory|accreditation|audit standards)\b/i.test(jdLower)) {
    const isClinical = /\b(clinical|patient care|hospital|nursing|healthcare|jcaho|hipaa|medical)\b/i.test(jdLower);
    pillars.push(
      isClinical
        ? "Regulatory Standards & Clinical Compliance"
        : "Regulatory Compliance & Quality Standards"
    );
  }

  // Sales / GTM
  if (/\b(pipeline|quota|revenue|sales cycle|prospecting|b2b)\b/i.test(jdLower)) {
    pillars.push("Revenue Generation & Pipeline Acceleration");
  }
  if (/\b(client relationships|account retention|executive stakeholder)\b/i.test(jdLower)) {
    pillars.push("Client Relationship & Account Expansion");
  }

  // Operations / Finance
  if (/\b(budget|p&l|financial modeling|forecasting|variance|audit)\b/i.test(jdLower)) {
    pillars.push("Fiscal Governance & Margin Optimization");
  }
  if (/\b(logistics|supply chain|vendor management|sla|process improvement)\b/i.test(jdLower)) {
    pillars.push("Process Optimization & Workflow Efficiency");
  }

  // Technical / Engineering
  if (/\b(architecture|distributed|scalability|fault-tolerant|reliability)\b/i.test(jdLower)) {
    pillars.push("System Reliability & Architecture Scale");
  }
  if (/\b(developer velocity|ci\/cd|automation|deployment)\b/i.test(jdLower)) {
    pillars.push("Delivery Velocity & Automation");
  }

  // Ensure REQ-EVT-01 2-4 pillar constraint: pad with universal fallbacks if < 2
  const generalFallbacks = [
    "Core Operational Execution",
    "Cross-Functional Collaboration",
    "Stakeholder Delivery",
  ];
  for (const fallback of generalFallbacks) {
    if (pillars.length >= 2) break;
    if (!pillars.includes(fallback)) {
      pillars.push(fallback);
    }
  }

  return pillars.slice(0, 4);
}

/**
 * Builds a concise 2-sentence career arc summary from the parsed experience AST (REQ-EVT-03).
 */
export function buildCareerArcContext(
  experience: Array<{ company?: string; title?: string }> = [],
  targetDomain?: string
): string {
  if (!experience || !Array.isArray(experience) || experience.length === 0) {
    return "Candidate possesses foundational experience aligned with the target role.";
  }

  const roleCount = experience.length;
  const recent = experience[0];
  const oldest = experience[experience.length - 1];

  const recentDesc = recent ? `${recent.title || "Specialist"} at ${recent.company || "organization"}` : "";
  const oldestDesc = oldest && oldest !== recent ? `starting as ${oldest.title || "contributor"} at ${oldest.company || "prior organization"}` : "";

  return `Candidate career trajectory encompasses ${roleCount} progressive role${roleCount === 1 ? "" : "s"}, currently serving as ${recentDesc}${oldestDesc ? `, ${oldestDesc}` : ""}. Key achievements emphasize demonstrated leadership and measurable domain excellence.`;
}
