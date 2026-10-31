/**
 * Universal Domain Taxonomy & Industry Calibration Engine
 *
 * Provides domain-native power verbs, authentic operational metric dimensions,
 * and industry classification so candidates from any profession—from hourly service
 * and healthcare to aviation, trades, finance, and engineering—receive authentic,
 * authoritative resume enhancements without software or corporate jargon bias.
 */

export type IndustryCategory =
  | 'healthcare'
  | 'hospitality_service'
  | 'sales_marketing'
  | 'finance_accounting'
  | 'operations_logistics'
  | 'trades_facilities'
  | 'aviation_aerospace'
  | 'education_coaching'
  | 'technology_engineering'
  | 'legal_compliance'
  | 'general_business';

export interface DomainTaxonomyConfig {
  category: IndustryCategory;
  displayName: string;
  primaryVerbs: string[];
  authenticMetricExamples: string[];
  bannedClichés: string[];
  evaluationDirectives: string[];
}

export const DOMAIN_TAXONOMIES: Record<IndustryCategory, DomainTaxonomyConfig> = {
  healthcare: {
    category: 'healthcare',
    displayName: 'Healthcare, Nursing & Medicine',
    primaryVerbs: [
      'Administered',
      'Triaged',
      'Coordinated',
      'Standardized',
      'Audited',
      'Championed',
      'Delivered',
      'Evaluated',
      'Synthesized',
      'Facilitated',
      'Maintained',
      'Instituted',
    ],
    authenticMetricExamples: [
      'Patient panel size (e.g. 450+ chronic-care patients)',
      'HCAHPS and patient satisfaction ratings (e.g. 96% rating)',
      'Hospital readmission reduction (e.g. 18% reduction in 30-day readmissions)',
      'Bed count and turnover (e.g. 42-bed telemetry unit)',
      'Clinical compliance audits (HIPAA, JCAHO 100% pass rate)',
      'Shift staffing coverage and nurse-to-patient ratios',
    ],
    bannedClichés: [
      'architected',
      'refactored',
      'deployed code',
      'passionate caregiver',
      'go-to nurse',
      'results-driven healer',
    ],
    evaluationDirectives: [
      'Focus on patient outcomes, clinical safety standards, and protocol compliance.',
      'Quantify with authentic volume: patient panels, bed counts, shift handoffs, and audit pass rates.',
      'Never use engineering or technical software jargon.',
    ],
  },

  hospitality_service: {
    category: 'hospitality_service',
    displayName: 'Hospitality, Dining & Food Service',
    primaryVerbs: [
      'Delivered',
      'Orchestrated',
      'Coordinated',
      'Upsold',
      'Standardized',
      'Accelerated',
      'Maintained',
      'Resolved',
      'Trained',
      'Maximized',
      'Curated',
      'Instituted',
    ],
    authenticMetricExamples: [
      'Covers per shift (e.g. 60+ covers during peak dinner rush)',
      'Dining room capacity (e.g. 120-seat high-volume restaurant)',
      'Average ticket size / spend increase (e.g. +15% via beverage pairing)',
      'Customer satisfaction / Yelp rating scores (e.g. 98% positive reviews)',
      'Health department inspection score (e.g. Grade A / 100% sanitation)',
      'POS cash reconciliation accuracy ($0 variance)',
    ],
    bannedClichés: [
      'architected',
      'refactored',
      'leveraged',
      'people person',
      'hard worker',
      'team player',
    ],
    evaluationDirectives: [
      'Emphasize guest experience, table turnover pace, ticket value, and sanitation safety.',
      'Quantify covers, table capacity, revenue per guest, and inspection grades.',
      'Avoid passive duty-listing like "waited tables" or "cleaned floors".',
    ],
  },

  trades_facilities: {
    category: 'trades_facilities',
    displayName: 'Trades, Facilities & Maintenance',
    primaryVerbs: [
      'Maintained',
      'Sanitized',
      'Inspected',
      'Overhauled',
      'Safeguarded',
      'Repaired',
      'Restocked',
      'Standardized',
      'Consolidated',
      'Instituted',
      'Executed',
      'Dispatched',
    ],
    authenticMetricExamples: [
      'Square feet of facility maintained (e.g. 65,000 sq. ft. campus)',
      'Daily occupant/student count supported (e.g. 800+ occupants)',
      'OSHA and state health inspection pass rate (e.g. 100% compliance)',
      'Preventative maintenance schedule fulfillment (e.g. 99% on-time maintenance)',
      'Work order resolution turnaround time (e.g. resolved within 2 hours)',
      'Zero lost-time safety incidents across 3+ years',
    ],
    bannedClichés: [
      'architected',
      'refactored',
      'synergized',
      'results-driven cleaner',
      'dedicated worker',
    ],
    evaluationDirectives: [
      'Highlight preventative maintenance, environmental safety, OSHA compliance, and facility scale.',
      'Quantify with square footage, occupant count, audit scores, and work order turnaround time.',
      'Eliminate passive phrases like "responsible for trash" or "helped fix machines".',
    ],
  },

  aviation_aerospace: {
    category: 'aviation_aerospace',
    displayName: 'Aviation, Aerospace & Flight Operations',
    primaryVerbs: [
      'Commanded',
      'Navigated',
      'Executed',
      'Ensured',
      'Coordinated',
      'Standardized',
      'Supervised',
      'Maintained',
      'Inspected',
      'Optimized',
      'Briefed',
      'Flew',
    ],
    authenticMetricExamples: [
      'Flight hours logged as PIC/SIC (e.g. 1,800+ PIC hours)',
      'On-time departure and arrival reliability rate (e.g. 99.2% on-time)',
      'FAA Part 121 / Part 135 regulatory compliance rate (100% clean record)',
      'Aircraft type ratings and airframes commanded (Boeing 737, Airbus A320)',
      'Fuel efficiency and flight route optimization savings',
      'Crew Resource Management (CRM) leadership across flight and cabin crew',
    ],
    bannedClichés: [
      'architected',
      'refactored',
      'passionate aviator',
      'born to fly',
      'results-oriented pilot',
    ],
    evaluationDirectives: [
      'Enforce aviation precision, safety protocols, flight hour volume, and FAA regulatory standards.',
      'Quantify with flight hours, aircraft types, on-time performance, and safety audit history.',
      'Position pilots and flight crew as decisive commanders and safety guardians.',
    ],
  },

  education_coaching: {
    category: 'education_coaching',
    displayName: 'Education, Teaching & Athletic Coaching',
    primaryVerbs: [
      'Instructed',
      'Directed',
      'Facilitated',
      'Mentored',
      'Formulated',
      'Curated',
      'Developed',
      'Evaluated',
      'Accelerated',
      'Standardized',
      'Pioneered',
      'Fostered',
    ],
    authenticMetricExamples: [
      'Student or athlete roster size (e.g. 22 varsity athletes, 120 students)',
      'Win/loss record and playoff/championship titles (e.g. 21-4 regional champions)',
      'Team cumulative academic GPA (e.g. 3.4 cumulative team GPA)',
      'Standardized test score improvement or pass rate (e.g. 94% state exam pass rate)',
      'Collegiate scholarship placements (e.g. 6 student-athletes committed to NCAA rosters)',
      'Curriculum adoption across school district or department',
    ],
    bannedClichés: [
      'architected',
      'refactored',
      'deploy',
      'guru',
      'passionate teacher',
      'born leader',
    ],
    evaluationDirectives: [
      'Highlight pedagogy, student development, tactical game strategy, academic gains, and character leadership.',
      'Quantify roster size, win/loss record, grade improvements, and state standard masteries.',
      'Replace passive phrases like "coached students" or "helped teach" with strategic direction.',
    ],
  },

  finance_accounting: {
    category: 'finance_accounting',
    displayName: 'Finance, Banking & Accounting',
    primaryVerbs: [
      'Reconciled',
      'Forecasted',
      'Audited',
      'Structured',
      'Consolidated',
      'Analyzed',
      'Optimized',
      'Formulated',
      'Mitigated',
      'Delivered',
      'Instituted',
      'Monitored',
    ],
    authenticMetricExamples: [
      'Asset volume or budget managed (e.g. $45M operational budget)',
      'Audit cycle turnaround time reduction (e.g. cut month-end close from 10 to 4 days)',
      'Variance reduction and forecasting accuracy (e.g. 98.5% forecast precision)',
      'Tax and regulatory compliance adherence (SOX, GAAP, SEC 100% compliance)',
      'Cost reduction identified (e.g. $1.2M in annual operational savings)',
      'Accounts payable/receivable throughput volume',
    ],
    bannedClichés: [
      'number cruncher',
      'detail-oriented bean counter',
      'passionate accountant',
      'synergistic finance',
    ],
    evaluationDirectives: [
      'Emphasize capital stewardship, GAAP/SOX compliance, variance precision, and close acceleration.',
      'Quantify balance sheet size, savings generated, and close turnaround speed.',
      'Eliminate passive phrases like "responsible for spreadsheets" or "assisted with bookkeeping".',
    ],
  },

  sales_marketing: {
    category: 'sales_marketing',
    displayName: 'Sales, Marketing & Business Development',
    primaryVerbs: [
      'Negotiated',
      'Captured',
      'Outperformed',
      'Expanded',
      'Generated',
      'Secured',
      'Converted',
      'Positioned',
      'Accelerated',
      'Spearheaded',
      'Acquired',
      'Penetrated',
    ],
    authenticMetricExamples: [
      'Quota attainment percentage (e.g. 138% of annual quota)',
      'Total revenue / pipeline generated (e.g. $3.8M in enterprise ARR)',
      'Average deal size / contract value (e.g. $125k ACV)',
      'Conversion rate increase and lead generation velocity (e.g. +24% lead-to-opportunity rate)',
      'Customer acquisition cost (CAC) reduction',
      'Account retention and net revenue retention (NRR) rate (e.g. 118% NRR)',
    ],
    bannedClichés: [
      'sales ninja',
      'rainmaker',
      'rockstar',
      'born closer',
      'people person',
    ],
    evaluationDirectives: [
      'Focus on revenue growth, deal size, quota exceeding, pipeline acceleration, and market penetration.',
      'Quantify attainment %, ARR, deal count, and retention velocity.',
      'Never list tasks without showing the business conversion outcome.',
    ],
  },

  operations_logistics: {
    category: 'operations_logistics',
    displayName: 'Operations, Logistics & Supply Chain',
    primaryVerbs: [
      'Mobilized',
      'Centralized',
      'Streamlined',
      'Procured',
      'Dispatched',
      'Consolidated',
      'Standardized',
      'Overhauled',
      'Optimized',
      'Enforced',
      'Maintained',
      'Executed',
    ],
    authenticMetricExamples: [
      'On-time delivery fulfillment SLA rate (e.g. 99.4% on-time delivery)',
      'Warehouse inventory throughput (e.g. 25,000 units processed daily)',
      'Vendor cost savings negotiated (e.g. 14% supplier spend reduction)',
      'Lead time reduction (e.g. compressed order fulfillment from 72 to 24 hours)',
      'Fleet utilization and freight route efficiency improvement',
      'Inventory accuracy and shrinkage reduction (e.g. 99.8% inventory accuracy)',
    ],
    bannedClichés: [
      'jack of all trades',
      'firefighter',
      'hard-working operator',
      'results-oriented logistician',
    ],
    evaluationDirectives: [
      'Highlight throughput volume, cycle time reduction, vendor negotiations, and SLA fulfillment.',
      'Quantify unit counts, fulfillment timelines, freight efficiencies, and procurement savings.',
      'Transform passive scheduling tasks into strategic operational delivery.',
    ],
  },

  legal_compliance: {
    category: 'legal_compliance',
    displayName: 'Legal, Regulatory & Compliance',
    primaryVerbs: [
      'Negotiated',
      'Drafted',
      'Structured',
      'Advised',
      'Resolved',
      'Litigated',
      'Ensured',
      'Audited',
      'Standardized',
      'Mitigated',
      'Authored',
      'Instituted',
    ],
    authenticMetricExamples: [
      'Contract volume negotiated (e.g. 180+ commercial vendor agreements annually)',
      'Regulatory audit pass rate (e.g. 100% compliance across state and federal reviews)',
      'Legal dispute and settlement exposure reduction (e.g. reduced litigation liability by $2.4M)',
      'Policy implementation across employee population (e.g. enterprise policy for 3,500 staff)',
      'Intellectual property portfolio filings (e.g. 14 patent and trademark registrations)',
      'Contract turnaround cycle time compression (e.g. cut NDA review from 5 days to 24 hours)',
    ],
    bannedClichés: [
      'legal eagle',
      'word-smith',
      'passionate attorney',
      'detail-obsessed counselor',
    ],
    evaluationDirectives: [
      'Focus on risk mitigation, contract scale, regulatory compliance, and governance precision.',
      'Quantify agreement counts, liability reductions, and turnaround velocity.',
      'Maintain authoritative, legally sound terminology.',
    ],
  },

  technology_engineering: {
    category: 'technology_engineering',
    displayName: 'Technology, Software & Engineering',
    primaryVerbs: [
      'Architected',
      'Engineered',
      'Automated',
      'Scaled',
      'Modernized',
      'Overhauled',
      'Delivered',
      'Standardized',
      'Refactored',
      'Deployed',
      'Designed',
      'Accelerated',
    ],
    authenticMetricExamples: [
      'System throughput and traffic volume (e.g. 15,000 requests/sec)',
      'Latency reduction (e.g. 35% reduction in P99 API latency)',
      'System availability / uptime SLA (e.g. 99.99% uptime)',
      'Deployment frequency and CI/CD cycle speed (e.g. daily releases with zero downtime)',
      'Cloud infrastructure cost optimization (e.g. $180k annual AWS savings)',
      'Data scale processed (e.g. 10TB+ daily analytics pipeline)',
    ],
    bannedClichés: [
      'rockstar coder',
      '10x engineer',
      'code wizard',
      'passionate hacker',
      'guru',
    ],
    evaluationDirectives: [
      'Highlight system architecture, scale, latency, throughput, and clean engineering craftsmanship.',
      'Quantify RPS, milliseconds saved, uptime percentage, and infrastructure cost reductions.',
      'Ground every technical claim in tangible business outcomes.',
    ],
  },

  general_business: {
    category: 'general_business',
    displayName: 'Business, Management & Professional Services',
    primaryVerbs: [
      'Orchestrated',
      'Spearheaded',
      'Directed',
      'Overhauled',
      'Delivered',
      'Standardized',
      'Accelerated',
      'Consolidated',
      'Instituted',
      'Facilitated',
      'Expanded',
      'Formulated',
    ],
    authenticMetricExamples: [
      'Project budget and portfolio scale (e.g. managed $2.5M project portfolio)',
      'Cross-functional team size directed (e.g. 18-member cross-functional squad)',
      'Milestone delivery speed (e.g. delivered 3 weeks ahead of schedule)',
      'Client retention and stakeholder satisfaction score (e.g. 96% stakeholder approval)',
      'Process improvement and operational efficiency gains (e.g. 28% reduction in cycle time)',
      'Company policy and workflow adoption across organization',
    ],
    bannedClichés: [
      'go-getter',
      'thought leader',
      'synergistic strategist',
      'dynamic professional',
      'wearing multiple hats',
    ],
    evaluationDirectives: [
      'Frame responsibilities as leadership ownership, measurable project delivery, and cross-functional success.',
      'Quantify team size, budget scale, milestone velocity, and organizational adoption.',
      'Eliminate passive wording like "helped with" or "supported managers".',
    ],
  },
};

/**
 * Detects the industry category for a job role using title and optional description context.
 */
export function detectIndustryCategory(title?: string, description?: string): IndustryCategory {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();

  // 1. Aviation & Aerospace
  if (
    /\b(pilot|first officer|captain|flight attendant|aviator|airframe|avionics|faa\b|cockpit|flight crew|aircraft|boeing|airbus|part 121)\b/.test(
      combined
    )
  ) {
    return 'aviation_aerospace';
  }

  // 2. Healthcare & Medicine
  if (
    /\b(nurse|nursing|physician|doctor|surgeon|hospitalist|clinical|medical assistant|triage|rn\b|bsn\b|patient care|hipaa|telemetry|clinic\b|oncology|pediatric|healthcare|phlebotomist|pharmacist)\b/.test(
      combined
    )
  ) {
    return 'healthcare';
  }

  // 3. Hospitality & Food Service
  if (
    /\b(waiter|waitress|server|bartender|barista|chef|line cook|restaurant|dining|sommelier|busser|catering|hospitality|food service|culinary|banquet|hostess|host\b)\b/.test(
      combined
    )
  ) {
    return 'hospitality_service';
  }

  // 4. Trades, Facilities & Maintenance
  if (
    /\b(janitor|custodian|custodial|cleaner|housekeeping|facilities|hvac|maintenance technician|plumber|electrician|carpenter|mechanic|sanitation|groundskeeping|repair technician)\b/.test(
      combined
    )
  ) {
    return 'trades_facilities';
  }

  // 5. Education & Athletic Coaching
  if (
    /\b(coach|coaching|teacher|teaching|professor|instructor|educator|varsity|curriculum|athletic|athletics|tutor|faculty|head coach|assistant coach|pedagogy|principal|classroom)\b/.test(
      combined
    )
  ) {
    return 'education_coaching';
  }

  // 6. Finance & Accounting
  if (
    /\b(accountant|accounting|auditor|audit\b|financial analyst|cpa\b|controller|bookkeeper|tax\b|treasury|actuary|underwriter|wealth management|banking|gaap|sox\b)\b/.test(
      combined
    )
  ) {
    return 'finance_accounting';
  }

  // 7. Legal & Compliance
  if (
    /\b(counsel|attorney|lawyer|paralegal|legal|litigation|compliance officer|contract manager|regulatory affairs|solicitor|juris doctor)\b/.test(
      combined
    )
  ) {
    return 'legal_compliance';
  }

  // 8. Sales & Marketing
  if (
    /\b(sales\b|account executive|bdr\b|sdr\b|business development|marketing|growth marketing|seo\b|sem\b|brand manager|public relations|quota|pipeline|copywriter)\b/.test(
      combined
    )
  ) {
    return 'sales_marketing';
  }

  // 9. Operations & Logistics
  if (
    /\b(supply chain|logistics|warehouse|procurement|inventory|fulfillment|shipping|distribution center|dispatcher|fleet|operations manager)\b/.test(
      combined
    )
  ) {
    return 'operations_logistics';
  }

  // 10. Technology & Engineering
  if (
    /\b(software|developer|devops|sre\b|frontend|backend|full stack|cloud engineer|data engineer|machine learning|firmware|cybersecurity|systems administrator|qa engineer|web developer)\b/.test(
      combined
    )
  ) {
    return 'technology_engineering';
  }

  return 'general_business';
}

/**
 * Returns the domain taxonomy configuration for a given category.
 * Gracefully defaults to 'general_business' if the category is unmapped.
 */
export function getDomainTaxonomy(category?: string | IndustryCategory): DomainTaxonomyConfig {
  const cat = (category as IndustryCategory) || 'general_business';
  return DOMAIN_TAXONOMIES[cat] || DOMAIN_TAXONOMIES.general_business;
}
