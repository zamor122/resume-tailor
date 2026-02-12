import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getFormatValidatorPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a resume"
      }, { status: 400 });
    }

    // Check for common ATS-unfriendly elements
    const checks = {
      hasTables: /<table|<tr|<td/i.test(resume) || resume.includes('│') || resume.includes('└'),
      hasImages: /<img|\[image|\.jpg|\.png|\.gif/i.test(resume),
      hasColumns: /column|multicolumn/i.test(resume.toLowerCase()),
      hasHeadersFooters: /header|footer|page break/i.test(resume.toLowerCase()),
      hasSpecialChars: /[^\x00-\x7F]/g.test(resume) && resume.match(/[^\x00-\x7F]/g)?.length > 10,
      hasUnicodeBullets: /[•●○▪▫►]/g.test(resume),
      hasHyperlinks: /https?:\/\//i.test(resume),
      hasFontTags: /<font|<span style/i.test(resume),
      lineLength: resume.split('\n').some((line: string) => line.length > 80),
      hasContactInfo: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(resume),
      hasSections: /(experience|education|skills|summary|objective)/i.test(resume),
      properFormatting: /^[A-Z][a-z]+ [A-Z][a-z]+/m.test(resume), // Name format
    };

    const prompt = getFormatValidatorPrompt(resume);

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    const result = await generateWithFallback(
      prompt,
      selectedModel,
      undefined,
      sessionApiKeys
    );
    const text = result.text.trim();

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      // Enhance with programmatic checks (defined here so it's in scope)
      const programmaticIssues: Array<{
        type: string;
        severity: string;
        description: string;
        location: string;
        fix: string;
      }> = [];
      if (checks.hasTables) {
        programmaticIssues.push({
          type: "formatting",
          severity: "critical",
          description: "Contains tables which ATS systems struggle to parse",
          location: "Throughout document",
          fix: "Convert tables to simple text with bullet points or line breaks"
        });
      }
      if (checks.hasImages) {
        programmaticIssues.push({
          type: "formatting",
          severity: "critical",
          description: "Contains images which ATS cannot read",
          location: "Image elements",
          fix: "Remove images and use text instead"
        });
      }
      if (checks.hasUnicodeBullets) {
        programmaticIssues.push({
          type: "formatting",
          severity: "warning",
          description: "Uses Unicode bullet points which may not parse correctly",
          location: "Bullet points",
          fix: "Use standard ASCII characters like '-' or '*' for bullets"
        });
      }
      if (!checks.hasContactInfo) {
        programmaticIssues.push({
          type: "content",
          severity: "critical",
          description: "Missing contact information",
          location: "Header section",
          fix: "Add email and phone number at the top"
        });
      }
      
      return NextResponse.json({
        atsCompatible: parsedResponse.atsCompatible !== false && programmaticIssues.filter(i => i.severity === 'critical').length === 0,
        score: Math.max(0, Math.min(100, (parsedResponse.score || 70) - (programmaticIssues.filter(i => i.severity === 'critical').length * 10))),
        issues: [...(parsedResponse.issues || []), ...programmaticIssues],
        sectionAnalysis: parsedResponse.sectionAnalysis || {},
        strengths: parsedResponse.strengths || [],
        recommendations: parsedResponse.recommendations || [],
        fileFormat: parsedResponse.fileFormat || { recommended: "pdf", reason: "Best ATS compatibility" },
        estimatedParsingAccuracy: parsedResponse.estimatedParsingAccuracy || 75,
        atsSystemCompatibility: parsedResponse.atsSystemCompatibility || {},
        checks: checks,
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse format validator response:', text);
      
      // Re-create programmatic issues for fallback
      const fallbackIssues: Array<{
        type: string;
        severity: string;
        description: string;
        location: string;
        fix: string;
      }> = [];
      
      if (checks.hasTables) {
        fallbackIssues.push({
          type: "formatting",
          severity: "critical",
          description: "Contains tables which ATS systems struggle to parse",
          location: "Throughout document",
          fix: "Convert tables to simple text with bullet points or line breaks"
        });
      }
      if (checks.hasImages) {
        fallbackIssues.push({
          type: "formatting",
          severity: "critical",
          description: "Contains images which ATS cannot read",
          location: "Image elements",
          fix: "Remove images and use text instead"
        });
      }
      if (!checks.hasContactInfo) {
        fallbackIssues.push({
          type: "content",
          severity: "critical",
          description: "Missing contact information",
          location: "Header section",
          fix: "Add email and phone number at the top"
        });
      }
      
      return NextResponse.json({
        atsCompatible: !checks.hasTables && !checks.hasImages,
        score: checks.hasTables || checks.hasImages ? 40 : 70,
        issues: fallbackIssues,
        strengths: checks.hasContactInfo ? ["Has contact information"] : [],
        recommendations: [],
        fileFormat: "pdf",
        estimatedParsingAccuracy: 70,
        checks: checks,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Format Validator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to validate format",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

