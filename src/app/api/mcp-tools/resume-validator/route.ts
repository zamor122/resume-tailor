import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 10;

interface ValidationResult {
  isValid: boolean;
  flaggedItems: Array<{
    type: 'hallucination' | 'fabrication' | 'metric' | 'technology' | 'company';
    description: string;
    location: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  summary: string;
}

// Extract facts from resume (companies, technologies, skills, dates)
function extractFacts(text: string): {
  companies: Set<string>;
  technologies: Set<string>;
  skills: Set<string>;
  dates: Set<string>;
  metrics: Array<{ value: string; context: string }>;
} {
  const companies = new Set<string>();
  const technologies = new Set<string>();
  const skills = new Set<string>();
  const dates = new Set<string>();
  const metrics: Array<{ value: string; context: string }> = [];
  
  // Extract company names (capitalized words, often after "at" or in experience section)
  const companyPattern = /(?:at|with|for)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+in|\s+at|$|,|\.)/g;
  let match;
  while ((match = companyPattern.exec(text)) !== null) {
    const company = match[1].trim();
    if (company.length > 2 && company.length < 50) {
      companies.add(company);
    }
  }
  
  // Extract technologies
  const techPattern = /\b(JavaScript|TypeScript|Python|Java|C\+\+|React|Angular|Vue|Node\.js|AWS|Docker|Kubernetes|SQL|MongoDB|PostgreSQL|Git|Linux|Windows|MacOS)\b/gi;
  const techMatches = text.match(techPattern);
  if (techMatches) {
    techMatches.forEach(tech => technologies.add(tech.toLowerCase()));
  }
  
  // Extract skills (from skills section or mentioned in context)
  const skillPattern = /\b(leadership|communication|teamwork|problem solving|collaboration|agile|scrum|project management)\b/gi;
  const skillMatches = text.match(skillPattern);
  if (skillMatches) {
    skillMatches.forEach(skill => skills.add(skill.toLowerCase()));
  }
  
  // Extract dates
  const datePattern = /\b(\d{4})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi;
  const dateMatches = text.match(datePattern);
  if (dateMatches) {
    dateMatches.forEach(date => dates.add(date));
  }
  
  // Extract metrics (numbers with context)
  const metricPattern = /(\d+(?:\.\d+)?%?)\s+(increase|decrease|improvement|reduction|growth|users|customers|revenue|sales|efficiency|performance)/gi;
  let metricMatch;
  while ((metricMatch = metricPattern.exec(text)) !== null) {
    metrics.push({
      value: metricMatch[1],
      context: metricMatch[0],
    });
  }
  
  return { companies, technologies, skills, dates, metrics };
}

// Compare two resumes and detect hallucinations
function validateResume(originalResume: string, tailoredResume: string): ValidationResult {
  const originalFacts = extractFacts(originalResume);
  const tailoredFacts = extractFacts(tailoredResume);
  
  const flaggedItems: ValidationResult['flaggedItems'] = [];
  
  // Check for new companies not in original
  tailoredFacts.companies.forEach(company => {
    if (!originalFacts.companies.has(company)) {
      // Check if it's a variation (case-insensitive)
      const found = [...originalFacts.companies].some(c => 
        c.toLowerCase() === company.toLowerCase()
      );
      if (!found) {
        flaggedItems.push({
          type: 'company',
          description: `Company "${company}" appears in tailored resume but not in original`,
          location: 'Experience section',
          severity: 'high',
        });
      }
    }
  });
  
  // Check for new technologies not in original
  tailoredFacts.technologies.forEach(tech => {
    if (!originalFacts.technologies.has(tech)) {
      const found = [...originalFacts.technologies].some(t => 
        t.toLowerCase() === tech.toLowerCase()
      );
      if (!found) {
        flaggedItems.push({
          type: 'technology',
          description: `Technology "${tech}" appears in tailored resume but not in original`,
          location: 'Skills/Experience section',
          severity: 'medium',
        });
      }
    }
  });
  
  // Check for fabricated metrics (new metrics not in original)
  tailoredFacts.metrics.forEach(metric => {
    const found = originalFacts.metrics.some(m => 
      m.value === metric.value && m.context.toLowerCase().includes(metric.context.toLowerCase().substring(0, 20))
    );
    if (!found) {
      // Check if similar metric exists
      const similarFound = originalFacts.metrics.some(m => 
        metric.context.toLowerCase().includes(m.context.toLowerCase().substring(0, 15))
      );
      if (!similarFound) {
        flaggedItems.push({
          type: 'metric',
          description: `Metric "${metric.value}" with context "${metric.context}" may be fabricated`,
          location: 'Experience section',
          severity: 'high',
        });
      }
    }
  });
  
  // Check for skills that don't appear in original
  tailoredFacts.skills.forEach(skill => {
    if (!originalFacts.skills.has(skill)) {
      const found = [...originalFacts.skills].some(s => 
        s.toLowerCase() === skill.toLowerCase()
      );
      if (!found) {
        flaggedItems.push({
          type: 'hallucination',
          description: `Skill "${skill}" appears in tailored resume but not clearly in original`,
          location: 'Skills section',
          severity: 'low',
        });
      }
    }
  });
  
  // Generate summary
  const isValid = flaggedItems.length === 0;
  let summary: string;
  if (isValid) {
    summary = 'Tailored resume is valid. All information can be traced to the original resume.';
  } else {
    const highSeverity = flaggedItems.filter(item => item.severity === 'high').length;
    summary = `Found ${flaggedItems.length} potential issue(s) (${highSeverity} high severity). `;
    if (highSeverity > 0) {
      summary += 'Please review flagged items for accuracy.';
    } else {
      summary += 'Most issues are minor and may be acceptable variations.';
    }
  }
  
  return {
    isValid,
    flaggedItems,
    summary,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { originalResume, tailoredResume } = await req.json();
    
    if (!originalResume || !tailoredResume) {
      return NextResponse.json(
        { error: "Invalid Input", message: "Both original and tailored resumes are required" },
        { status: 400 }
      );
    }
    
    const result = validateResume(originalResume, tailoredResume);
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Resume Validator error:', error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to validate resume",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





