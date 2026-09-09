export interface RoleSEOData {
  slug: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  actionVerbs: string[];
  sampleBullet: string;
}

export const ROLE_PAGES: RoleSEOData[] = [
  {
    slug: "software-engineer",
    title: "Software Engineer",
    category: "Technology",
    description: "Top ATS keywords, technical competencies, and high-impact action verbs for software engineering resumes in 2026.",
    keywords: ["TypeScript", "React", "Node.js", "PostgreSQL", "System Architecture", "CI/CD", "AWS", "Docker", "RESTful APIs", "Microservices", "Unit Testing", "Git"],
    actionVerbs: ["Architected", "Shipped", "Engineered", "Optimized", "Refactored", "Deployed", "Scaled"],
    sampleBullet: "Architected event-driven microservices using TypeScript and Node.js on AWS ECS, reducing end-to-end API latency by 42% for 2M+ monthly active users.",
  },
  {
    slug: "product-manager",
    title: "Product Manager",
    category: "Product",
    description: "Essential keywords, product discovery frameworks, and roadmap execution terms for Product Management resumes.",
    keywords: ["Product Roadmap", "User Research", "A/B Testing", "Agile / Scrum", "KPI Tracking", "Feature Prioritization", "Stakeholder Management", "GTM Strategy", "SQL", "User Stories"],
    actionVerbs: ["Spearheaded", "Prioritized", "Launched", "Validated", "Orchestrated", "Defined", "Scaled"],
    sampleBullet: "Spearheaded GTM strategy for self-serve analytics tier, driving 28% increase in trial-to-paid conversion and generating $1.4M in ARR within two quarters.",
  },
  {
    slug: "data-analyst",
    title: "Data Analyst",
    category: "Data & Analytics",
    description: "Critical SQL, BI tools, and data visualization keywords for passing ATS resume screening.",
    keywords: ["SQL", "Tableau", "Power BI", "Python", "ETL Pipelines", "Data Modeling", "Statistical Analysis", "Cohort Analysis", "Excel", "Data Governance"],
    actionVerbs: ["Analyzed", "Synthesized", "Automated", "Forecasted", "Modeled", "Discovered", "Visualized"],
    sampleBullet: "Built automated executive Tableau dashboards tracking real-time cohort retention and CAC across 5 marketing channels, saving 12 hours/week in reporting overhead.",
  },
  {
    slug: "registered-nurse",
    title: "Registered Nurse (RN)",
    category: "Healthcare",
    description: "Clinical care, patient advocacy, and EHR documentation keywords for medical and nursing resumes.",
    keywords: ["Patient Assessment", "Care Planning", "Electronic Health Records (Epic/Cerner)", "Medication Administration", "Triage", "Critical Care", "BLS / ACLS", "Infection Control"],
    actionVerbs: ["Administered", "Monitored", "Coordinated", "Assessed", "Advocated", "Educated", "Stabilized"],
    sampleBullet: "Delivered comprehensive acute care for 5-7 cardiac step-down patients per shift, maintaining zero medication administration errors across 18 consecutive months.",
  },
  {
    slug: "data-scientist",
    title: "Data Scientist",
    category: "Data & Analytics",
    description: "Machine learning, statistical modeling, and deep learning ATS keywords for data science roles.",
    keywords: ["Machine Learning", "Python", "PyTorch", "TensorFlow", "Feature Engineering", "A/B Testing", "NLP", "Pandas", "Scikit-Learn", "BigQuery"],
    actionVerbs: ["Trained", "Engineered", "Optimized", "Formulated", "Deployed", "Evaluated", "Productionized"],
    sampleBullet: "Trained and productionized a multi-task gradient boosted model for customer churn prediction, improving recall by 19% and mitigating $850K in customer attrition.",
  },
  {
    slug: "full-stack-developer",
    title: "Full Stack Developer",
    category: "Technology",
    description: "Front-end and back-end integration keywords, cloud deployment, and API design competencies.",
    keywords: ["Next.js", "React", "TypeScript", "Node.js", "PostgreSQL", "MongoDB", "GraphQL", "Tailwind CSS", "AWS", "Docker"],
    actionVerbs: ["Built", "Integrated", "Implemented", "Designed", "Consolidated", "Maintained", "Automated"],
    sampleBullet: "Built responsive full-stack SaaS application with Next.js and Supabase, implementing real-time WebSocket notifications and Stripe subscription billing.",
  },
  {
    slug: "devops-engineer",
    title: "DevOps / SRE Engineer",
    category: "Technology",
    description: "Infrastructure as Code, Kubernetes, CI/CD pipelines, and observability keywords for DevOps resumes.",
    keywords: ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS / GCP", "Prometheus", "Grafana", "Linux", "Bash", "Helm", "Incident Response"],
    actionVerbs: ["Automated", "Orchestrated", "Hardened", "Provisioned", "Standardized", "Monitored", "Containerized"],
    sampleBullet: "Provisioned multi-region Kubernetes clusters with Terraform and automated GitHub Actions CI/CD pipelines, cutting deployment cycle times from 45 min to under 6 min.",
  },
  {
    slug: "marketing-manager",
    title: "Marketing Manager",
    category: "Marketing",
    description: "Growth marketing, SEO, paid media, and demand generation keywords for marketing leadership resumes.",
    keywords: ["Demand Generation", "SEO / SEM", "Content Strategy", "Email Automation (HubSpot)", "PPC Campaigns", "Google Analytics 4", "CAC / LTV Optimization", "Brand Management"],
    actionVerbs: ["Executed", "Boosted", "Managed", "Captured", "Amplified", "Targeted", "Optimized"],
    sampleBullet: "Managed $450K annual paid search and LinkedIn ad budget, driving 34% reduction in CAC while scaling qualified pipeline leads by 55% YoY.",
  },
  {
    slug: "executive-assistant",
    title: "Executive Assistant",
    category: "Administrative",
    description: "Calendar management, travel coordination, and executive operations keywords for administrative resumes.",
    keywords: ["Executive Calendar Management", "Travel Logistics", "Confidential Communications", "Expense Reporting (Concur)", "Meeting Coordination", "Event Planning", "Board Packets"],
    actionVerbs: ["Coordinated", "Streamlined", "Facilitated", "Organized", "Prepared", "Negotiated", "Managed"],
    sampleBullet: "Coordinated complex international travel, board presentations, and multi-timezone schedules for 3 C-suite executives, reducing scheduling conflicts by 90%.",
  },
  {
    slug: "financial-analyst",
    title: "Financial Analyst",
    category: "Finance",
    description: "Financial modeling, forecasting, budgeting, and variance analysis keywords for corporate finance resumes.",
    keywords: ["Financial Modeling (DCF)", "Variance Analysis", "Budgeting & Forecasting", "Excel (VBA/Macros)", "P&L Analysis", "SAP / NetSuite", "Cash Flow Forecasting", "GAAP Compliance"],
    actionVerbs: ["Modeled", "Forecasted", "Audited", "Identified", "Constructed", "Reported", "Consolidated"],
    sampleBullet: "Constructed dynamic rolling 3-year revenue models and monthly variance reports for $40M business unit, identifying $600K in annualized operational cost efficiencies.",
  },
  {
    slug: "customer-success-manager",
    title: "Customer Success Manager",
    category: "Sales & Support",
    description: "Account retention, onboarding, net revenue retention (NRR), and client advocacy keywords.",
    keywords: ["Net Revenue Retention (NRR)", "Client Onboarding", "Churn Reduction", "Account Health Scoring", "QBR Delivery", "Salesforce / Gainsight", "Upselling / Cross-selling"],
    actionVerbs: ["Retained", "Expanded", "Onboarded", "Advocated", "Drove", "Facilitated", "Renewed"],
    sampleBullet: "Managed portfolio of 45 enterprise accounts totaling $3.8M ARR, achieving 114% Net Revenue Retention through proactive QBR engagement and feature adoption workflows.",
  },
  {
    slug: "project-manager",
    title: "Project Manager",
    category: "Operations",
    description: "Agile, Waterfall, risk mitigation, and cross-functional delivery keywords for project management resumes.",
    keywords: ["Agile / Scrum", "Risk Mitigation", "PMP / Prince2", "Resource Allocation", "Jira / Asana", "Scope Management", "Budget Tracking", "Stakeholder Communication"],
    actionVerbs: ["Delivered", "Directed", "Mitigated", "Aligned", "Tracked", "Facilitated", "Executed"],
    sampleBullet: "Delivered 14 enterprise software implementation projects on time and 8% under budget, managing cross-functional teams of 20+ engineers, designers, and business analysts.",
  },
];

export function getRoleBySlug(slug: string): RoleSEOData | undefined {
  return ROLE_PAGES.find((r) => r.slug === slug);
}
