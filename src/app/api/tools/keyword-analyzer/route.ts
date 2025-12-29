import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, industry, sessionId, modelKey } = await req.json();
    
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a job description with at least 100 characters"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the following job description and extract industry-specific keywords that are critical for ATS systems and recruiters.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact numbers, frequencies, and specific resume sections.
      - Require keyword frequency counts (exact number of occurrences)
      - Provide synonyms and alternative terms (exact terms)
      - Specify exact resume sections where keywords should appear
      - Include keyword importance scores (0-100)
      - Provide natural incorporation examples
      
      ${industry ? `Industry: ${industry}` : ''}
      
      Extract and categorize:
      1. Technical Skills (programming languages, tools, technologies)
      2. Soft Skills (communication, leadership, etc.)
      3. Industry-Specific Terms (domain knowledge, methodologies)
      4. Certifications & Qualifications
      5. Experience Level Indicators (junior, senior, lead, etc.)
      6. Action Verbs (managed, developed, implemented, etc.)
      7. Power Words (high-impact terms that stand out)
      
      For each keyword, provide:
      - The keyword/phrase (exact term)
      - Importance level (critical, high, medium, low)
      - Importance score (0-100)
      - Frequency in job description (exact count)
      - Alternative terms/synonyms (exact terms)
      - Recommended resume sections (specific sections)
      - Incorporation example (exact phrase or sentence)
      
      Return ONLY a JSON object with this exact format:
      {
        "keywords": {
          "technical": [
            {
              "term": "<exact keyword>",
              "importance": "<critical|high|medium|low>",
              "importanceScore": <number 0-100>,
              "frequency": <exact number of occurrences>,
              "synonyms": ["<exact synonym1>", "<exact synonym2>"],
              "recommendedSections": ["<section1>", "<section2>"],
              "incorporationExample": "<exact phrase showing how to use>"
            }
          ],
          "soft": [...],
          "industry": [...],
          "certifications": [...],
          "actionVerbs": [...],
          "powerWords": [...]
        },
        "keywordDensity": {
          "totalKeywords": <number>,
          "criticalKeywords": <number>,
          "averageFrequency": <number>,
          "mostFrequent": [{"keyword": "<term>", "count": <number>}, ...]
        },
        "missingFromResume": [
          {
            "keyword": "<keyword>",
            "importance": "<critical|high|medium|low>",
            "importanceScore": <number 0-100>,
            "recommendedSections": ["<section1>", ...],
            "incorporationExample": "<exact phrase>"
          }
        ],
        "recommendations": [
          {
            "keyword": "<keyword>",
            "reason": "<specific reason why it's important>",
            "suggestion": "<specific action: exact section and example phrase>",
            "expectedImpact": "<how this improves ATS match>",
            "priority": "<critical|high|medium|low>"
          }
        ],
        "industryBenchmark": {
          "industryAverage": <number of keywords typically found>,
          "thisJob": <number of keywords found>,
          "comparison": "<above|at|below average>"
        },
        "industry": "<detected or provided industry>",
        "experienceLevel": "<entry|mid|senior|executive>"
      }
      
      Job Description:
      ${jobDescription.substring(0, 8000)}
    `;

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
      
      return NextResponse.json({
        keywords: parsedResponse.keywords || {},
        keywordDensity: parsedResponse.keywordDensity || {},
        missingFromResume: parsedResponse.missingFromResume || [],
        recommendations: parsedResponse.recommendations || [],
        industryBenchmark: parsedResponse.industryBenchmark || {},
        industry: parsedResponse.industry || industry || "Unknown",
        experienceLevel: parsedResponse.experienceLevel || "mid",
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse keyword analyzer response:', text);
      
      // Fallback: basic keyword extraction
      const techKeywords = jobDescription.match(/\b(JavaScript|Python|React|Node\.js|AWS|Docker|Kubernetes|SQL|TypeScript|Java|C\+\+|Go|Rust)\b/gi) || [];
      
      return NextResponse.json({
        keywords: {
          technical: [...new Set(techKeywords)].map(term => ({
            term,
            importance: "high",
            frequency: 1,
            synonyms: []
          })),
          soft: [],
          industry: [],
          certifications: [],
          actionVerbs: [],
          powerWords: [],
        },
        missingFromResume: [],
        recommendations: [],
        industry: industry || "Technology",
        experienceLevel: "mid",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Keyword Analyzer error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze keywords",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

