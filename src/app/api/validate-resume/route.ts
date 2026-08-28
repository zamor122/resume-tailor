import { NextRequest, NextResponse } from "next/server";

type Severity = 'low' | 'medium' | 'high';

interface FlaggedItem {
  type: 'hallucination' | 'fabrication' | 'metric' | 'technology' | 'company';
  description: string;
  location: string;
  severity: Severity;
}

interface ValidationResult {
  isValid: boolean;
  flaggedItems: FlaggedItem[];
  summary: string;
}

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { originalResume, tailoredResume } = await req.json();
    if (!originalResume || !tailoredResume) {
      return NextResponse.json({ error: "Both original and tailored resumes are required" }, { status: 400 });
    }

    const flagged: FlaggedItem[] = [];
    const orig = originalResume;
    const tail = tailoredResume;

    // Deterministic validation (no LLM).

    // 1. Fabrication check: compare original vs tailored content.
    // Flag numbers that changed by >50% (possible fabricated metrics).
    const origNums = (orig.match(/\d+/g) || []).map(Number);
    const tailNums = (tail.match(/\d+/g) || []).map(Number);
    const origAvg = origNums.length ? origNums.reduce((a: number, b: number) =>a+b,0)/origNums.length : 0;
    const tailAvg = tailNums.length ? tailNums.reduce((a: number, b: number) =>a+b,0)/tailNums.length : 0;

    if (origAvg > 0 && tailAvg > 0 && Math.abs(tailAvg - origAvg) / origAvg > 0.5) {
      flagged.push({
        type: 'metric',
        description: 'Metric values significantly differ from original. Verify numbers are accurate.',
        location: 'Throughout',
        severity: 'medium',
      });
    }

    // 2. Technology check: look for obviously wrong tech claims.
    const TECH_PATTERN = /\b(?:React|Angular|Vue|Node|Python|Java|AWS|Azure|GCP|SQL|NoSQL|TypeScript|JavaScript|GraphQL|REST|Docker|Kubernetes|Terraform|CI\/CD)\b/gi;
    const techMentions = tail.match(TECH_PATTERN) || [];
    const origTechMatches = orig.match(TECH_PATTERN) || [];
    const origTech = new Set(origTechMatches);

    for (const t of new Set(techMentions)) {
      if (!origTech.has(t)) {
        flagged.push({
          type: 'technology',
          description: `Technology "${t}" appears in tailored resume but not in original. Verify it was in your experience.`,
          location: 'Skills / Experience',
          severity: 'low',
        });
      }
    }


    // 3. Company names that differ significantly.
    const origCompanies = orig.match(/\b(?:at|for|with)\s+([A-Z][a-zA-Z&. ]{3,30})\b/g) || [];
    const tailCompanies = tail.match(/\b(?:at|for|with)\s+([A-Z][a-zA-Z&. ]{3,30})\b/g) || [];
    const newCompanies = tailCompanies.filter((tc: string) => !origCompanies.some((oc: string) => 
      oc.toLowerCase().replace(/\s+/g,'') === tc.toLowerCase().replace(/\s+/g,''))
    );
    if (newCompanies.length > 2) {
      flagged.push({
        type: 'company',
        description: `${newCompanies.length} company references appear new. Verify all companies are real.`,
        location: 'Experience',
        severity: 'medium',
      });
    }

    // 4. Resume length sanity check.
    if (tail.length < orig.length * 0.5) {
      flagged.push({ type: 'hallucination', description: 'Tailored resume is less than 50% of original length — content may have been dropped.', location: 'Entire document', severity: 'high' });
    }
    if (tail.length > orig.length * 1.5) {
      flagged.push({ type: 'fabrication', description: 'Tailored resume is >150% of original length — new content may have been fabricated.', location: 'Entire document', severity: 'medium' });
    }

    // 5. Contact info preserved check.
    const origEmail = orig.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const tailEmail = tail.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (origEmail && origEmail[0] !== (tailEmail?.[0] || '')) {
      flagged.push({ type: 'fabrication', description: 'Email address may have changed.', location: 'Contact section', severity: 'high' });
    }

    const highCount = flagged.filter(f => f.severity === 'high').length;
    const medCount = flagged.filter(f => f.severity === 'medium').length;
    const lowCount = flagged.filter(f => f.severity === 'low').length;

    const result: ValidationResult = {
      isValid: highCount === 0 && medCount <= 2,
      flaggedItems: flagged,
      summary: highCount > 0
        ? `${highCount} high-severity issue(s) found. Review flagged items before submitting.`
        : flagged.length > 0
          ? `${flagged.length} issue(s) found — ${medCount} medium, ${lowCount} low. Generally safe to submit.`
          : 'No issues detected. Resume appears consistent with original.',
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to validate resume", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
