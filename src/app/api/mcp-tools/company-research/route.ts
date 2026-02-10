import { NextRequest, NextResponse } from "next/server";
import { looksLikeCompanyName } from "@/app/utils/companyNameValidator";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 10;

interface CompanyResearchResult {
  companyName: string;
  jobTitle: string;
  companyInfo: {
    industry: string;
    size: string;
    culture: string;
    values: string[];
    keywords: string[];
  };
  jobInfo: {
    teamStructure: string;
    reporting: string;
    growth: string;
    priorities: string[];
  };
  enhancedJobDescription: string;
}

// Industry keywords mapping
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'Technology': ['software', 'tech', 'saas', 'cloud', 'ai', 'machine learning', 'data', 'platform'],
  'Finance': ['financial', 'banking', 'investment', 'trading', 'fintech', 'wealth management'],
  'Healthcare': ['health', 'medical', 'pharmaceutical', 'biotech', 'patient care', 'clinical'],
  'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting'],
  'Retail': ['retail', 'e-commerce', 'consumer', 'merchandise', 'sales'],
  'Education': ['education', 'learning', 'academic', 'university', 'school'],
};

// Company size indicators
const SIZE_PATTERNS = [
  { pattern: /\b(startup|early stage|seed|series [a-z])\b/i, size: 'Startup (1-50)' },
  { pattern: /\b(small|medium|mid-size)\b/i, size: 'Small-Medium (50-500)' },
  { pattern: /\b(large|enterprise|fortune|multinational)\b/i, size: 'Large (500+)' },
];

/** True if the string looks like a job title so we don't store it as company name. */
function looksLikeJobTitle(s: string): boolean {
  if (!s?.trim()) return false;
  const t = s.trim();
  if (/^(senior|lead|principal|staff|chief|head of|associate|junior)\s+/i.test(t)) return true;
  if (/\s+(engineer|manager|director|analyst|developer|designer|coordinator|specialist|consultant|architect)$/i.test(t)) return true;
  if (/^software engineer$/i.test(t) || /^product manager$/i.test(t)) return true;
  return false;
}

/** Clear companyName when it looks like a phrase, not a company (e.g. cached bad value). */
function sanitizeCompanyName(result: CompanyResearchResult): CompanyResearchResult {
  if (!result.companyName || looksLikeCompanyName(result.companyName)) return result;
  return { ...result, companyName: '' };
}

function extractCompanyInfo(jobDescription: string): CompanyResearchResult {
  // Extract company name only when clearly present in the job description.
  // If not found, leave empty so we don't store a wrong value (e.g. job title).
  let companyName = '';
  // "at/with/for Company Name" (e.g. "Software Engineer at Experian")
  const atWithForMatch = jobDescription.match(/(?:at|with|for)\s+([A-Z][A-Za-z0-9\s&.-]+?)(?:\s+in|\s+at|$|,|\s+\()/i);
  if (atWithForMatch) {
    companyName = atWithForMatch[1].trim();
  }
  if (!companyName) {
    // "About Company Name" or "About Us at Company"
    const aboutMatch = jobDescription.match(/About\s+([A-Z][A-Za-z0-9\s&.-]+?)(?:\s+[A-Z]|\s*$|\n)/);
    if (aboutMatch) {
      const name = aboutMatch[1].trim();
      if (!/^(us|the\s+company|our\s+team)$/i.test(name)) companyName = name;
    }
  }
  if (!companyName) {
    // "Company Name is a/an ..."
    const isMatch = jobDescription.match(/^([A-Z][A-Za-z0-9\s&.-]+?)\s+is\s+(?:a|an)\s/m);
    if (isMatch) companyName = isMatch[1].trim();
  }
  if (!companyName) {
    // "Company Name (NYSE: ..." or "Company Name ("
    const parenMatch = jobDescription.match(/([A-Z][A-Za-z0-9\s&.-]+?)\s*\((?:\s*NYSE|NASDAQ|ticker|listed)/i);
    if (parenMatch) companyName = parenMatch[1].trim();
  }

  // Don't store a value that looks like a job title (e.g. "Software Engineer", "Senior Manager")
  if (companyName && looksLikeJobTitle(companyName)) companyName = '';
  // Don't store long or clearly non-company phrases (e.g. "other engineering teams to bring...")
  if (companyName && !looksLikeCompanyName(companyName)) companyName = '';

  // Extract job title
  let jobTitle = 'Software Engineer'; // Default
  const titleMatch = jobDescription.match(/^(?:position|role|title)[:\s]+(.+?)(?:\n|$)/i) ||
                     jobDescription.match(/\b(?:looking for|seeking|hiring)\s+(?:a|an)?\s*(.+?)(?:\s+to|\s+who|$)/i);
  if (titleMatch) {
    jobTitle = titleMatch[1].trim();
  }
  
  // Detect industry
  let industry = 'Technology';
  let maxMatches = 0;
  for (const [ind, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const matches = keywords.filter(kw => jobDescription.toLowerCase().includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      industry = ind;
    }
  }
  
  // Detect company size
  let size = 'Medium (50-500)';
  for (const { pattern, size: detectedSize } of SIZE_PATTERNS) {
    if (pattern.test(jobDescription)) {
      size = detectedSize;
      break;
    }
  }
  
  // Extract culture keywords
  const cultureKeywords: string[] = [];
  const culturePatterns = [
    /\b(collaborative|team-oriented|fast-paced|innovative|creative|flexible|remote|hybrid)\b/gi,
    /\b(diverse|inclusive|equity|work-life balance)\b/gi,
  ];
  culturePatterns.forEach(pattern => {
    const matches = jobDescription.match(pattern);
    if (matches) {
      cultureKeywords.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  // Extract values (common company values mentioned)
  const values: string[] = [];
  const valuePatterns = [
    /\b(integrity|excellence|innovation|customer focus|transparency|accountability)\b/gi,
  ];
  valuePatterns.forEach(pattern => {
    const matches = jobDescription.match(pattern);
    if (matches) {
      values.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  // Extract team structure info
  let teamStructure = 'Not specified';
  if (jobDescription.match(/\b(cross-functional|agile|scrum|squad|pod)\b/i)) {
    teamStructure = 'Cross-functional Agile teams';
  } else if (jobDescription.match(/\b(reporting to|manager|director|vp)\b/i)) {
    teamStructure = 'Hierarchical structure';
  }
  
  // Extract reporting info
  let reporting = 'Not specified';
  const reportingMatch = jobDescription.match(/report(?:ing)?\s+to\s+(.+?)(?:\n|$)/i);
  if (reportingMatch) {
    reporting = reportingMatch[1].trim();
  }
  
  // Extract growth opportunities
  let growth = 'Not specified';
  if (jobDescription.match(/\b(career growth|advancement|promotion|development|learning)\b/i)) {
    growth = 'Career growth and development opportunities available';
  }
  
  // Extract priorities
  const priorities: string[] = [];
  const priorityPatterns = [
    /(?:priority|focus|key|important)[:\s]+(.+?)(?:\n|$)/gi,
  ];
  priorityPatterns.forEach(pattern => {
    const matches = [...jobDescription.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        priorities.push(match[1].trim());
      }
    });
  });
  
  // Enhance job description with extracted info
  const enhancements: string[] = [];
  if (industry !== 'Technology') {
    enhancements.push(`Industry: ${industry}`);
  }
  if (cultureKeywords.length > 0) {
    enhancements.push(`Culture: ${cultureKeywords.slice(0, 3).join(', ')}`);
  }
  if (values.length > 0) {
    enhancements.push(`Values: ${values.slice(0, 3).join(', ')}`);
  }
  
  const enhancedJobDescription = enhancements.length > 0
    ? `${jobDescription}\n\n[Context: ${enhancements.join(' | ')}]`
    : jobDescription;
  
  return {
    companyName,
    jobTitle,
    companyInfo: {
      industry,
      size,
      culture: cultureKeywords.slice(0, 5).join(', ') || 'Not specified',
      values: [...new Set(values)].slice(0, 5),
      keywords: [...new Set([...cultureKeywords, ...values])].slice(0, 10),
    },
    jobInfo: {
      teamStructure,
      reporting,
      growth,
      priorities: priorities.slice(0, 5),
    },
    enhancedJobDescription,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();
    
    if (!jobDescription || jobDescription.length < 50) {
      return NextResponse.json(
        { error: "Invalid Input", message: "Job description is required (minimum 50 characters)" },
        { status: 400 }
      );
    }

    const result = extractCompanyInfo(jobDescription);
    const sanitized = sanitizeCompanyName(result);

    return NextResponse.json({
      ...sanitized,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Company Research error:', error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to research company",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





