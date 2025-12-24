import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, industry } = await req.json();
    
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a job description with at least 100 characters"
      }, { status: 400 });
    }

    const prompt = `
      Analyze the following job description and extract industry-specific keywords that are critical for ATS systems and recruiters.
      
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
      - The keyword/phrase
      - Importance level (critical, high, medium, low)
      - Frequency in job description
      - Alternative terms/synonyms
      
      Return ONLY a JSON object with this exact format:
      {
        "keywords": {
          "technical": [
            {
              "term": "<keyword>",
              "importance": "<critical|high|medium|low>",
              "frequency": <number>,
              "synonyms": ["synonym1", "synonym2"]
            }
          ],
          "soft": [...],
          "industry": [...],
          "certifications": [...],
          "actionVerbs": [...],
          "powerWords": [...]
        },
        "missingFromResume": ["keyword1", "keyword2", ...],
        "recommendations": [
          {
            "keyword": "<keyword>",
            "reason": "<why it's important>",
            "suggestion": "<how to incorporate>"
          }
        ],
        "industry": "<detected or provided industry>",
        "experienceLevel": "<entry|mid|senior|executive>"
      }
      
      Job Description:
      ${jobDescription.substring(0, 8000)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      return NextResponse.json({
        keywords: parsedResponse.keywords || {},
        missingFromResume: parsedResponse.missingFromResume || [],
        recommendations: parsedResponse.recommendations || [],
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

