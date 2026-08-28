import { NextRequest, NextResponse } from "next/server";
import { sanitizeResumeForATS } from "@/app/utils/atsSanitizer";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, source } = await req.json();
    if (!resume || resume.length < 100) {
      return NextResponse.json({ error: "Invalid Input", message: "Please provide a resume with at least 100 characters" }, { status: 400 });
    }

    const text = source === "before" ? sanitizeResumeForATS(resume) : resume;
    const lower = text.toLowerCase();
    const lines = text.split('\n').filter(Boolean);
    const words = text.split(/\s+/).filter(Boolean);

    // Deterministic ATS simulation (no LLM).
    // Score based on structure presence, keyword density, format hygiene.

    const issues: Array<{type:string;severity:string;description:string;location:string;fix:string}> = [];
    const recommendations: string[] = [];
    let baseScore = 70;

    // Contact info detection
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text);
    const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
    if (!hasEmail) { issues.push({ type: "content", severity: "critical", description: "No email address detected", location: "Contact section", fix: "Add a professional email address" }); baseScore -= 10; }
    if (!hasPhone) { issues.push({ type: "content", severity: "warning", description: "No phone number detected", location: "Contact section", fix: "Add a phone number" }); baseScore -= 5; }

    // Section detection
    const hasExperience = /experience|work history|employment/i.test(lower);
    const hasEducation = /education|academic|university|college/i.test(lower);
    const hasSkills = /skills|technologies|competencies/i.test(lower);
    const hasSummary = /summary|objective|profile/i.test(lower);

    if (!hasExperience) { issues.push({ type: "structure", severity: "critical", description: "No experience section found", location: "Body", fix: "Add an Experience or Work History section" }); baseScore -= 15; }
    if (!hasEducation) { issues.push({ type: "structure", severity: "warning", description: "No education section found", location: "Body", fix: "Add an Education section" }); baseScore -= 8; }
    if (!hasSkills) { issues.push({ type: "structure", severity: "warning", description: "No skills section found", location: "Body", fix: "Add a Skills section" }); baseScore -= 8; }

    // Format hygiene
    const hasTables = /<table|<tr|<td/i.test(text) || text.includes('│');
    const hasImages = /<img|\[image|\.jpg|\.png|\.gif/i.test(text);
    const hasColumns = /column|multicolumn/i.test(lower);
    const hasBullets = /[•●○▪▫►]/.test(text);

    if (hasTables) { issues.push({ type: "formatting", severity: "critical", description: "Contains table elements", location: "Throughout", fix: "Remove tables; use bullet points" }); baseScore -= 12; }
    if (hasImages) { issues.push({ type: "formatting", severity: "critical", description: "Contains image references", location: "Throughout", fix: "Remove images; ATS cannot read them" }); baseScore -= 12; }
    if (hasColumns) { issues.push({ type: "formatting", severity: "warning", description: "May contain multi-column layout", location: "Layout", fix: "Use single-column format" }); baseScore -= 5; }
    if (hasBullets) { issues.push({ type: "formatting", severity: "info", description: "Uses Unicode bullets", location: "Bullet points", fix: "Replace with dashes or asterisks" }); }

    // Keyword / content richness
    const kwDensity = words.length > 0 ? words.filter((w: string) => w.length > 3).length / words.length : 0;
    if (kwDensity < 0.6 && words.length > 50) { issues.push({ type: "content", severity: "warning", description: "Low keyword density", location: "Throughout", fix: "Include more industry-specific terms" }); baseScore -= 5; }

    // Section analysis (what ATS would detect)
    const sectionAnalysis: Record<string, { detected: boolean; confidence?: number }> = {};
    if (hasExperience) sectionAnalysis.experience = { detected: true, confidence: 90 };
    if (hasEducation) sectionAnalysis.education = { detected: true, confidence: 90 };
    if (hasSkills) sectionAnalysis.skills = { detected: true, confidence: 85 };
    if (hasSummary) sectionAnalysis.summary = { detected: true, confidence: 80 };

    const atsScore = Math.max(0, Math.min(100, baseScore));

    if (atsScore >= 80) recommendations.push("Your resume has good ATS compatibility.");
    if (atsScore < 60) recommendations.push("Significant ATS issues detected. Review critical issues above.");
    recommendations.push("Export as PDF for best compatibility");

    return NextResponse.json({
      atsScore,
      parsingAccuracy: atsScore,
      atsSystemCompatibility: {},
      parsedData: {
        contactInfo: { email: hasEmail ? "detected" : null, phone: hasPhone ? "detected" : null },
        skills: [],
        experience: [],
        education: [],
      },
      sectionAnalysis,
      issues,
      keywords: [],
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Server Error", message: "Failed to simulate ATS parsing", details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
