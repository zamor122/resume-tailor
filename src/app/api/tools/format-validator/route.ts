import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume } = await req.json();
    if (!resume || resume.length < 100) {
      return NextResponse.json({ error: "Invalid Input", message: "Please provide a resume" }, { status: 400 });
    }

    const r = resume;
    const checks = {
      hasTables: /<table|<tr|<td/i.test(r) || r.includes('│') || r.includes('└'),
      hasImages: /<img|\[image|\.jpg|\.png|\.gif/i.test(r),
      hasColumns: /column|multicolumn/i.test(r.toLowerCase()),
      hasHeadersFooters: /header|footer|page break/i.test(r.toLowerCase()),
      hasSpecialChars: /[^\x00-\x7F]/g.test(r) && (r.match(/[^\x00-\x7F]/g)?.length ?? 0) > 10,
      hasUnicodeBullets: /[•●○▪▫►]/g.test(r),
      hasHyperlinks: /https?:\/\//i.test(r),
      hasFontTags: /<font|<span style/i.test(r),
      lineLength: r.split('\n').some((l: string) => l.length > 80),
      hasContactInfo: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(r),
      hasSections: /(experience|education|skills|summary|objective)/i.test(r),
      properFormatting: /^[A-Z][a-z]+ [A-Z][a-z]+/m.test(r),
    };

    const issues: Array<{type:string;severity:string;description:string;location:string;fix:string}> = [];
    const strengths: string[] = [];

    if(checks.hasTables) issues.push({type:"formatting",severity:"critical",description:"Contains tables which ATS systems struggle to parse",location:"Throughout document",fix:"Convert tables to simple text with bullet points or line breaks"});
    if(checks.hasImages) issues.push({type:"formatting",severity:"critical",description:"Contains images which ATS cannot read",location:"Image elements",fix:"Remove images and use text instead"});
    if(checks.hasUnicodeBullets) issues.push({type:"formatting",severity:"warning",description:"Uses Unicode bullet points which may not parse correctly",location:"Bullet points",fix:"Use standard ASCII characters like '-' or '*'"});
    if(!checks.hasContactInfo) issues.push({type:"content",severity:"critical",description:"Missing contact information",location:"Header section",fix:"Add email and phone number at the top"});
    if(checks.hasColumns) issues.push({type:"formatting",severity:"warning",description:"Multi-column layouts may confuse ATS parsers",location:"Layout",fix:"Use single-column layout"});
    if(!checks.hasSections) issues.push({type:"content",severity:"warning",description:"Missing key resume sections",location:"Structure",fix:"Add standard section headings"});
    if(checks.lineLength) issues.push({type:"formatting",severity:"info",description:"Some lines exceed 80 characters",location:"Throughout",fix:"Wrap long lines"});

    if(checks.hasContactInfo) strengths.push("Has contact information");
    if(checks.hasSections) strengths.push("Has standard resume sections");
    if(!checks.hasTables&&!checks.hasImages) strengths.push("No tables or images detected");
    if(checks.properFormatting) strengths.push("Name format detected");
    if(!checks.hasFontTags) strengths.push("Clean formatting");

    const critical = issues.filter(i=>i.severity==='critical');
    const score = Math.max(0,Math.min(100,100-(critical.length*15)-(issues.filter(i=>i.severity==='warning').length*5)));

    return NextResponse.json({
      atsCompatible: critical.length===0,
      score,
      issues,
      sectionAnalysis: {},
      strengths,
      recommendations: [],
      fileFormat: { recommended: "pdf", reason: "Best ATS compatibility" },
      estimatedParsingAccuracy: Math.max(40,100-(critical.length*20)),
      atsSystemCompatibility: {},
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Server Error", message: "Failed to validate format", details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
