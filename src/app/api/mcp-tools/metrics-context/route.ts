import { NextRequest, NextResponse } from "next/server";
import { generateCacheKey, getCached, setCache } from "@/app/utils/mcp-tools";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 10;

interface MetricGuidance {
  teamSizeRange: string;
  userScaleRange: string;
  percentImprovementRange: string;
  costSavingsRange: string;
  industryExamples: string[];
  forbiddenPatterns: string[];
}

interface MetricsContextResult {
  metricGuidance: MetricGuidance;
  companySize: string;
  industry: string;
}

const SIZE_PATTERNS = [
  { pattern: /\b(startup|early stage|seed|series [a-z])\b/i, size: "Startup (1-50)" },
  { pattern: /\b(small|medium|mid-size)\b/i, size: "Small-Medium (50-500)" },
  { pattern: /\b(large|enterprise|fortune|multinational)\b/i, size: "Large (500+)" },
];

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  Technology: ["software", "tech", "saas", "cloud", "ai", "machine learning", "data", "platform"],
  Finance: ["financial", "banking", "investment", "trading", "fintech", "wealth management"],
  Healthcare: ["health", "medical", "pharmaceutical", "biotech", "patient care", "clinical"],
  Consulting: ["consulting", "advisory", "strategy", "management consulting"],
  Retail: ["retail", "e-commerce", "consumer", "merchandise", "sales"],
  Education: ["education", "learning", "academic", "university", "school"],
};

const METRIC_RANGES: Record<
  string,
  {
    teamSizeRange: string;
    userScaleRange: string;
    percentImprovementRange: string;
    costSavingsRange: string;
    forbiddenPatterns: string[];
  }
> = {
  "Startup (1-50)": {
    teamSizeRange: "2-10",
    userScaleRange: "100-10K",
    percentImprovementRange: "10-40%",
    costSavingsRange: "$10K-$100K",
    forbiddenPatterns: ["1M users", "million users", "Fortune 500", "global scale", "worldwide", "multi-million dollar"],
  },
  "Small-Medium (50-500)": {
    teamSizeRange: "5-20",
    userScaleRange: "1K-100K",
    percentImprovementRange: "15-50%",
    costSavingsRange: "$50K-$500K",
    forbiddenPatterns: ["1M+ users", "Fortune 500", "global scale", "billions"],
  },
  "Large (500+)": {
    teamSizeRange: "10-50+",
    userScaleRange: "10K-1M+",
    percentImprovementRange: "20-70%",
    costSavingsRange: "$100K-$M+",
    forbiddenPatterns: [],
  },
};

const INDUSTRY_METRIC_EXAMPLES: Record<string, string[]> = {
  Technology: ["reduced latency by 30%", "served 5K daily active users", "improved query performance by 40%", "cut build time by 25%"],
  Finance: ["processed $2M in transactions", "reduced fraud by 15%", "improved loan approval by 20%", "handled 10K daily transactions"],
  Healthcare: ["improved patient outcomes by 25%", "reduced wait times by 30%", "managed 500+ patient records", "decreased readmission rate by 15%"],
  Consulting: ["delivered 15+ client engagements", "reduced project delivery by 20%", "led teams of 5-8", "improved client satisfaction by 25%"],
  Retail: ["increased conversions by 15%", "managed $1M in inventory", "served 20K monthly customers", "improved checkout flow by 30%"],
  Education: ["improved student engagement by 25%", "managed 500+ students", "reduced administrative time by 40%", "delivered 50+ courses"],
};

function inferCompanySize(
  jobDescription: string,
  companyResearch?: { companyInfo?: { size?: string } }
): string {
  if (companyResearch?.companyInfo?.size) {
    return companyResearch.companyInfo.size;
  }
  for (const { pattern, size } of SIZE_PATTERNS) {
    if (pattern.test(jobDescription)) {
      return size;
    }
  }
  return "Small-Medium (50-500)";
}

function inferIndustry(
  jobDescription: string,
  companyResearch?: { companyInfo?: { industry?: string } }
): string {
  if (companyResearch?.companyInfo?.industry) {
    return companyResearch.companyInfo.industry;
  }
  let industry = "Technology";
  let maxMatches = 0;
  for (const [ind, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const matches = keywords.filter((kw) => jobDescription.toLowerCase().includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      industry = ind;
    }
  }
  return industry;
}

function buildMetricGuidance(companySize: string, industry: string): MetricGuidance {
  const ranges = METRIC_RANGES[companySize] ?? METRIC_RANGES["Small-Medium (50-500)"];
  const examples = INDUSTRY_METRIC_EXAMPLES[industry] ?? INDUSTRY_METRIC_EXAMPLES.Technology;

  return {
    teamSizeRange: ranges.teamSizeRange,
    userScaleRange: ranges.userScaleRange,
    percentImprovementRange: ranges.percentImprovementRange,
    costSavingsRange: ranges.costSavingsRange,
    industryExamples: examples,
    forbiddenPatterns: ranges.forbiddenPatterns,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobDescription, companyResearch } = body as {
      jobDescription: string;
      companyResearch?: { companyInfo?: { size?: string; industry?: string } };
    };

    if (!jobDescription || jobDescription.length < 50) {
      return NextResponse.json(
        { error: "Invalid Input", message: "jobDescription is required (minimum 50 characters)" },
        { status: 400 }
      );
    }

    const cacheKey = generateCacheKey("metrics-context", jobDescription);
    const cached = getCached<MetricsContextResult>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, timestamp: new Date().toISOString() });
    }

    const companySize = inferCompanySize(jobDescription, companyResearch);
    const industry = inferIndustry(jobDescription, companyResearch);
    const metricGuidance = buildMetricGuidance(companySize, industry);

    const result: MetricsContextResult = { metricGuidance, companySize, industry };
    setCache(cacheKey, result, 15 * 60 * 1000);

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[metrics-context] Error:", error);
    return NextResponse.json(
      {
        error: "Metrics context failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
