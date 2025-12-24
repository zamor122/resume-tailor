import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 90;

interface ProcessedContent {
  type: "resume" | "job_description";
  structuredData: {
    resume?: {
      contact: {
        name?: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        portfolio?: string;
      };
      summary?: string;
      experience: Array<{
        title: string;
        company: string;
        location?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description: string[];
        achievements?: string[];
      }>;
      education: Array<{
        degree: string;
        institution: string;
        field?: string;
        graduationDate?: string;
        gpa?: string;
        honors?: string[];
      }>;
      skills: {
        technical: string[];
        soft: string[];
        languages?: string[];
        certifications?: string[];
      };
      projects?: Array<{
        name: string;
        description: string;
        technologies: string[];
        url?: string;
      }>;
    };
    jobDescription?: {
      metadata: {
        jobTitle: string;
        company: string;
        location?: string;
        type?: string; // full-time, part-time, contract
        salary?: string;
      };
      description: string;
      requirements: {
        required: Array<{
          category: string;
          items: string[];
        }>;
        preferred?: Array<{
          category: string;
          items: string[];
        }>;
      };
      responsibilities: string[];
      qualifications: {
        education?: string[];
        experience?: string[];
        skills?: string[];
        certifications?: string[];
      };
      benefits?: string[];
      applicationInstructions?: string;
    };
  };
  entities: {
    companies: string[];
    technologies: string[];
    skills: string[];
    certifications: string[];
    locations: string[];
  };
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    strength: number;
  }>;
  insights: {
    keyPoints: string[];
    strengths: string[];
    gaps?: string[];
    recommendations: string[];
  };
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const { type, content, resume, jobDescription } = await req.json();
    
    const contentToProcess = content || (type === "resume" ? resume : jobDescription);
    
    if (!contentToProcess || contentToProcess.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Content to process is required (minimum 100 characters)"
      }, { status: 400 });
    }

    const contentType = type || (resume ? "resume" : "job_description");

    const prompt = `
      Perform deep analysis and extraction of structured data from this ${contentType}.
      
      Extract:
      1. All structured sections and fields
      2. Entities (companies, technologies, skills, certifications, locations)
      3. Relationships between entities (e.g., "used React at Company X")
      4. Key insights and patterns
      5. Generate a comprehensive summary
      
      ${contentType === "resume" ? `
      Resume Structure:
      - Contact information (name, email, phone, location, LinkedIn, portfolio)
      - Professional summary or objective
      - Work experience (title, company, dates, location, descriptions, achievements)
      - Education (degree, institution, field, graduation date, GPA, honors)
      - Skills (technical, soft, languages, certifications)
      - Projects (name, description, technologies, URL)
      ` : `
      Job Description Structure:
      - Metadata (job title, company, location, type, salary)
      - Job description
      - Requirements (required and preferred, categorized)
      - Responsibilities (list of duties)
      - Qualifications (education, experience, skills, certifications)
      - Benefits
      - Application instructions
      `}
      
      Return ONLY a JSON object:
      {
        "type": "<resume|job_description>",
        "structuredData": {
          ${contentType === "resume" ? `
          "resume": {
            "contact": { ... },
            "summary": "<summary text>",
            "experience": [ ... ],
            "education": [ ... ],
            "skills": { ... },
            "projects": [ ... ]
          }
          ` : `
          "jobDescription": {
            "metadata": { ... },
            "description": "<description>",
            "requirements": { ... },
            "responsibilities": [ ... ],
            "qualifications": { ... },
            "benefits": [ ... ],
            "applicationInstructions": "<instructions>"
          }
          `}
        },
        "entities": {
          "companies": ["company1", ...],
          "technologies": ["tech1", ...],
          "skills": ["skill1", ...],
          "certifications": ["cert1", ...],
          "locations": ["location1", ...]
        },
        "relationships": [
          {
            "from": "<entity1>",
            "to": "<entity2>",
            "type": "<relationship type>",
            "strength": <number 0-100>
          }
        ],
        "insights": {
          "keyPoints": ["point1", ...],
          "strengths": ["strength1", ...],
          "gaps": ["gap1", ...],
          "recommendations": ["rec1", ...]
        },
        "summary": "<comprehensive summary>"
      }
      
      Content to process:
      ${contentToProcess.substring(0, 12000)}
    `;

    let result;
    let response;
    let text;
    
    try {
      result = await model.generateContent(prompt);
      response = await result.response;
      text = response.text().trim();
    } catch (apiError: any) {
      // Handle quota/rate limit errors
      if (apiError?.status === 429 || apiError?.message?.includes('429') || apiError?.message?.includes('quota')) {
        console.error('Gemini API quota exceeded in content processor:', apiError);
        
        // Return fallback with basic extraction
        const entities = {
          companies: (contentToProcess.match(/\b[A-Z][a-z]+ (?:Inc|LLC|Corp|Ltd|Company|Technologies|Systems)\b/g) || []).slice(0, 10),
          technologies: (contentToProcess.match(/\b(?:JavaScript|Python|React|Node\.js|AWS|Docker|Kubernetes|SQL|TypeScript|Java|C\+\+|Go|Rust|Angular|Vue|MongoDB|PostgreSQL|Redis|GraphQL)\b/gi) || []).slice(0, 20),
          skills: [],
          certifications: (contentToProcess.match(/\b(?:AWS|Azure|GCP|PMP|CISSP|CEH|CISSP|CISM|CISA)\b/gi) || []).slice(0, 10),
          locations: []
        };

        return NextResponse.json({
          type: contentType,
          structuredData: {},
          entities,
          relationships: [],
          insights: {
            keyPoints: [],
            strengths: [],
          recommendations: [
            "⚠️ API quota exceeded - using basic extraction",
            "You can retry immediately or wait 30 seconds for full processing"
          ]
        },
        summary: "⚠️ API quota exceeded. Basic entity extraction completed. Full processing unavailable.",
        quotaExceeded: true,
        retryAfter: 30,
        canRetryImmediately: true
        });
      }
      throw apiError; // Re-throw if not a quota error
    }

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse: ProcessedContent = JSON.parse(cleanedText);
      
      // Validate and enhance
      const processed: ProcessedContent = {
        type: parsedResponse.type || contentType,
        structuredData: parsedResponse.structuredData || {},
        entities: parsedResponse.entities || {
          companies: [],
          technologies: [],
          skills: [],
          certifications: [],
          locations: []
        },
        relationships: parsedResponse.relationships || [],
        insights: parsedResponse.insights || {
          keyPoints: [],
          strengths: [],
          recommendations: []
        },
        summary: parsedResponse.summary || "Content processed successfully"
      };

      return NextResponse.json(processed);
    } catch (parseError) {
      console.error('Failed to parse content processor response:', text);
      
      // Fallback: basic extraction
      const entities = {
        companies: (contentToProcess.match(/\b[A-Z][a-z]+ (?:Inc|LLC|Corp|Ltd|Company|Technologies|Systems)\b/g) || []).slice(0, 10),
        technologies: (contentToProcess.match(/\b(?:JavaScript|Python|React|Node\.js|AWS|Docker|Kubernetes|SQL|TypeScript|Java|C\+\+|Go|Rust|Angular|Vue|MongoDB|PostgreSQL|Redis|GraphQL)\b/gi) || []).slice(0, 20),
        skills: [],
        certifications: (contentToProcess.match(/\b(?:AWS|Azure|GCP|PMP|CISSP|CEH|CISSP|CISM|CISA)\b/gi) || []).slice(0, 10),
        locations: []
      };

      return NextResponse.json({
        type: contentType,
        structuredData: {},
        entities,
        relationships: [],
        insights: {
          keyPoints: [],
          strengths: [],
          recommendations: ["Enable full parsing by providing well-structured content"]
        },
        summary: "Basic entity extraction completed"
      });
    }
  } catch (error) {
    console.error('Content Processor error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to process content",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

