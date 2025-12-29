import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a resume with at least 100 characters"
      }, { status: 400 });
    }

    const prompt = `
      You are an ATS (Applicant Tracking System) simulator. Analyze the following resume as if you were parsing it through real ATS systems.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact numbers, line references, and ATS system names.
      
      Simulate how major ATS systems (Workday, Taleo, Greenhouse, Lever, iCIMS, Bullhorn) would parse this resume.
      
      Analyze:
      1. Contact Information Extraction (name, email, phone, location) - Provide parsing confidence % for each field
      2. Skills Extraction (technical skills, soft skills) - List exact skills found and confidence %
      3. Work Experience Parsing (job titles, companies, dates, descriptions) - Specify which sections parse correctly/incorrectly
      4. Education Parsing (degrees, institutions, dates) - Provide parsing accuracy %
      5. Keywords Detection (industry keywords, technologies) - Count occurrences
      6. Formatting Issues (headers, sections, bullet points) - Provide specific line numbers or section names
      7. ATS Compatibility Score (0-100) - Calculate based on specific criteria
      
      Return ONLY a JSON object with this exact format:
      {
        "atsScore": <number 0-100>,
        "parsingAccuracy": <number 0-100, overall parsing confidence>,
        "atsSystemCompatibility": {
          "workday": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]},
          "taleo": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]},
          "greenhouse": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]},
          "lever": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]}
        },
        "parsedData": {
          "contactInfo": {
            "name": "<extracted name or null>",
            "email": "<extracted email or null>",
            "phone": "<extracted phone or null>",
            "location": "<extracted location or null>",
            "parsingConfidence": {"name": <number 0-100>, "email": <number 0-100>, "phone": <number 0-100>, "location": <number 0-100>}
          },
          "skills": [
            {"skill": "<skill name>", "confidence": <number 0-100>, "source": "<where found in resume>"}
          ],
          "experience": [
            {
              "title": "<job title>",
              "company": "<company name>",
              "dates": "<date range>",
              "description": "<parsed description>",
              "parsingAccuracy": <number 0-100>,
              "sectionParsed": <boolean>
            }
          ],
          "education": [
            {
              "degree": "<degree>",
              "institution": "<institution>",
              "dates": "<date range>",
              "parsingAccuracy": <number 0-100>
            }
          ]
        },
        "sectionAnalysis": {
          "header": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]},
          "experience": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]},
          "education": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]},
          "skills": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]}
        },
        "issues": [
          {
            "type": "<formatting|missing|unparseable>",
            "severity": "<critical|high|medium|low>",
            "description": "<specific issue description>",
            "location": "<exact location: line number, section name, or character position>",
            "atsSystemsAffected": ["<ATS system names that would fail>"],
            "recommendation": "<specific fix with example>",
            "impact": "<how this affects parsing score>"
          }
        ],
        "keywords": [
          {"keyword": "<keyword>", "count": <number>, "importance": "<critical|high|medium|low>"}
        ],
        "recommendations": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action to take>",
            "expectedImprovement": <number, points added to score>,
            "example": "<before> → <after>"
          }
        ]
      }
      
      Resume to analyze:
      ${resume.substring(0, 10000)}
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
      
      // Validate and enhance response
      return NextResponse.json({
        atsScore: Math.min(100, Math.max(0, parsedResponse.atsScore || 0)),
        parsingAccuracy: parsedResponse.parsingAccuracy || parsedResponse.atsScore || 0,
        atsSystemCompatibility: parsedResponse.atsSystemCompatibility || {},
        parsedData: parsedResponse.parsedData || {},
        sectionAnalysis: parsedResponse.sectionAnalysis || {},
        issues: parsedResponse.issues || [],
        keywords: parsedResponse.keywords || [],
        recommendations: parsedResponse.recommendations || [],
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse ATS simulator response:', text);
      
      // Fallback: basic parsing
      const emailMatch = resume.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      const phoneMatch = resume.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      
      return NextResponse.json({
        atsScore: 70,
        parsedData: {
          contactInfo: {
            email: emailMatch ? emailMatch[0] : null,
            phone: phoneMatch ? phoneMatch[0] : null,
          },
          skills: [],
          experience: [],
          education: [],
        },
        issues: [],
        keywords: [],
        recommendations: ["Enable full parsing by using structured format"],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('ATS Simulator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to simulate ATS parsing",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

