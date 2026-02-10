import { NextRequest, NextResponse } from "next/server";
import { generateCacheKey, getCached, setCache } from "@/app/utils/mcp-tools";

import type { FormatSpec } from "@/app/types/format";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 10;

// Industry-to-format presets (professional best practices)
const FORMAT_PRESETS: Record<string, FormatSpec> = {
  Finance: {
    fontFamily: "Georgia",
    fontSize: { base: 11, heading: 16, subheading: 12 },
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    lineHeight: 1.3,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "education", "skills"],
    style: "traditional",
    colorScheme: "black-white",
  },
  Legal: {
    fontFamily: "Times New Roman",
    fontSize: { base: 12, heading: 16, subheading: 13 },
    margins: { top: 25, right: 25, bottom: 25, left: 25 },
    lineHeight: 1.35,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "education", "skills"],
    style: "traditional",
    colorScheme: "black-white",
  },
  Government: {
    fontFamily: "Times New Roman",
    fontSize: { base: 11, heading: 14, subheading: 12 },
    margins: { top: 19, right: 19, bottom: 19, left: 19 },
    lineHeight: 1.25,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "education", "skills"],
    style: "traditional",
    colorScheme: "black-white",
  },
  Technology: {
    fontFamily: "Arial",
    fontSize: { base: 11, heading: 18, subheading: 13 },
    margins: { top: 18, right: 18, bottom: 18, left: 18 },
    lineHeight: 1.4,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "skills", "education"],
    style: "modern",
    colorScheme: "subtle-accent",
  },
  Consulting: {
    fontFamily: "Georgia",
    fontSize: { base: 11, heading: 16, subheading: 12 },
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    lineHeight: 1.35,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "education", "skills"],
    style: "traditional",
    colorScheme: "black-white",
  },
  Healthcare: {
    fontFamily: "Georgia",
    fontSize: { base: 11, heading: 15, subheading: 12 },
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    lineHeight: 1.3,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "education", "skills"],
    style: "traditional",
    colorScheme: "black-white",
  },
  Education: {
    fontFamily: "Times New Roman",
    fontSize: { base: 12, heading: 16, subheading: 13 },
    margins: { top: 25, right: 25, bottom: 25, left: 25 },
    lineHeight: 1.4,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "education", "skills"],
    style: "traditional",
    colorScheme: "black-white",
  },
  Retail: {
    fontFamily: "Arial",
    fontSize: { base: 11, heading: 16, subheading: 12 },
    margins: { top: 18, right: 18, bottom: 18, left: 18 },
    lineHeight: 1.35,
    layout: "single-column",
    sectionOrder: ["contact", "summary", "experience", "skills", "education"],
    style: "modern",
    colorScheme: "subtle-accent",
  },
  Creative: {
    fontFamily: "Arial",
    fontSize: { base: 11, heading: 18, subheading: 13 },
    margins: { top: 18, right: 18, bottom: 18, left: 18 },
    lineHeight: 1.45,
    layout: "two-column-skills",
    sectionOrder: ["contact", "summary", "experience", "skills", "education"],
    style: "modern",
    colorScheme: "subtle-accent",
  },
};

const DEFAULT_FORMAT: FormatSpec = FORMAT_PRESETS.Technology;

function getFormatForIndustry(industry: string): FormatSpec {
  const normalized = industry?.trim() || "Technology";
  return FORMAT_PRESETS[normalized] ?? DEFAULT_FORMAT;
}

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, industry, jobTitle, tailoredResume } = await req.json();

    if (!jobDescription || jobDescription.length < 50) {
      return NextResponse.json(
        { error: "Invalid Input", message: "Job description is required (minimum 50 characters)" },
        { status: 400 }
      );
    }

    const cacheKey = generateCacheKey("format-recommender", `${industry}:${jobTitle}:${jobDescription.slice(0, 500)}`);
    const cached = getCached<FormatSpec>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const formatSpec = getFormatForIndustry(industry || "Technology");
    setCache(cacheKey, formatSpec, 15 * 60 * 1000);

    return NextResponse.json(formatSpec);
  } catch (error) {
    console.error("Format Recommender error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to recommend format",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
