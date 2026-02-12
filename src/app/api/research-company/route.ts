import { NextRequest, NextResponse } from "next/server";
import { getModelFromSession } from "@/app/utils/model-helper";
import { generateContentWithFallback } from "@/app/services/ai-provider";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import {
  getCompanyExtractionPrompt,
  getCompanyResearchPrompt,
  getJobDescriptionEnhancementPrompt,
} from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    const reqOrigin = req.headers.get('origin') || req.nextUrl.origin;
    const { modelKey } = await getModelFromSession(undefined, undefined, reqOrigin);

    // Extract company name and job title
    const extractPrompt = getCompanyExtractionPrompt(jobDescription);

    const extractResult = await generateContentWithFallback(extractPrompt, modelKey);
    const extractData = parseJSONFromText<{ companyName: string; jobTitle: string }>(extractResult.text);

    if (!extractData?.companyName || !extractData?.jobTitle) {
      return NextResponse.json(
        { error: "Could not extract company name or job title" },
        { status: 400 }
      );
    }

    // Research company information
    const researchPrompt = getCompanyResearchPrompt(
      extractData.companyName,
      extractData.jobTitle,
      jobDescription
    );

    const researchResult = await generateContentWithFallback(researchPrompt, modelKey);
    const researchData = parseJSONFromText<{
      companyInfo: CompanyResearchResult['companyInfo'];
      jobInfo: CompanyResearchResult['jobInfo'];
    }>(researchResult.text);

    if (!researchData) {
      return NextResponse.json(
        { error: "Could not gather company research" },
        { status: 500 }
      );
    }

    // Enhance job description with research data
    const enhancePrompt = getJobDescriptionEnhancementPrompt(
      jobDescription,
      researchData.companyInfo,
      researchData.jobInfo
    );

    const enhanceResult = await generateContentWithFallback(enhancePrompt, modelKey);

    const result: CompanyResearchResult = {
      companyName: extractData.companyName,
      jobTitle: extractData.jobTitle,
      companyInfo: researchData.companyInfo,
      jobInfo: researchData.jobInfo,
      enhancedJobDescription: enhanceResult.text,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error in company research:", error);
    return NextResponse.json(
      {
        error: "Failed to research company",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}



