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
    const { resume } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a resume with at least 100 characters"
      }, { status: 400 });
    }

    const prompt = `
      You are an ATS (Applicant Tracking System) simulator. Analyze the following resume as if you were parsing it through a real ATS system.
      
      Simulate how major ATS systems (like Workday, Taleo, Greenhouse, Lever) would parse this resume.
      
      Analyze:
      1. Contact Information Extraction (name, email, phone, location)
      2. Skills Extraction (technical skills, soft skills)
      3. Work Experience Parsing (job titles, companies, dates, descriptions)
      4. Education Parsing (degrees, institutions, dates)
      5. Keywords Detection (industry keywords, technologies)
      6. Formatting Issues (headers, sections, bullet points)
      7. ATS Compatibility Score (0-100)
      
      Return ONLY a JSON object with this exact format:
      {
        "atsScore": <number 0-100>,
        "parsedData": {
          "contactInfo": {
            "name": "<extracted name or null>",
            "email": "<extracted email or null>",
            "phone": "<extracted phone or null>",
            "location": "<extracted location or null>"
          },
          "skills": ["skill1", "skill2", ...],
          "experience": [
            {
              "title": "<job title>",
              "company": "<company name>",
              "dates": "<date range>",
              "description": "<parsed description>"
            }
          ],
          "education": [
            {
              "degree": "<degree>",
              "institution": "<institution>",
              "dates": "<date range>"
            }
          ]
        },
        "issues": [
          {
            "type": "<formatting|missing|unparseable>",
            "severity": "<low|medium|high>",
            "description": "<issue description>",
            "recommendation": "<how to fix>"
          }
        ],
        "keywords": ["keyword1", "keyword2", ...],
        "recommendations": ["recommendation1", "recommendation2", ...]
      }
      
      Resume to analyze:
      ${resume.substring(0, 10000)}
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
      
      // Validate and enhance response
      return NextResponse.json({
        atsScore: Math.min(100, Math.max(0, parsedResponse.atsScore || 0)),
        parsedData: parsedResponse.parsedData || {},
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

