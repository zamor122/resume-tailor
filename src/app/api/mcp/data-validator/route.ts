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

interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: Array<{
    type: "error" | "warning" | "info";
    field?: string;
    message: string;
    suggestion?: string;
  }>;
  strengths: string[];
  normalized?: {
    resume?: string;
    jobDescription?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { type, content, resume, jobDescription } = await req.json();
    
    // Determine what to validate
    const validateResume = type === "resume" || resume;
    const validateJobDescription = type === "job_description" || jobDescription;
    const validateBoth = resume && jobDescription;

    if (!validateResume && !validateJobDescription && !content) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Content to validate is required"
      }, { status: 400 });
    }

    const validationResults: ValidationResult = {
      isValid: true,
      score: 100,
      issues: [],
      strengths: []
    };

    // Resume validation
    if (validateResume || (content && type === "resume")) {
      const resumeContent = resume || content;
      
      const prompt = `
        Validate this resume for structure, completeness, and quality.
        
        Check for:
        1. Contact information (name, email, phone)
        2. Required sections (Experience, Education, Skills)
        3. Date formats and consistency
        4. Proper formatting
        5. Content quality and completeness
        6. Common errors or missing information
        
        Resume:
        ${resumeContent.substring(0, 8000)}
        
        Return ONLY a JSON object:
        {
          "isValid": <boolean>,
          "score": <number 0-100>,
          "issues": [
            {
              "type": "<error|warning|info>",
              "field": "<field name>",
              "message": "<issue description>",
              "suggestion": "<how to fix>"
            }
          ],
          "strengths": ["<strength1>", ...],
          "normalized": "<cleaned and normalized version if needed>"
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        const cleanedText = text
          .replace(/```(?:json)?\n?/g, '')
          .replace(/```\n?$/g, '')
          .trim();
        
        const resumeValidation = JSON.parse(cleanedText);
        
        validationResults.issues.push(...(resumeValidation.issues || []));
        validationResults.strengths.push(...(resumeValidation.strengths || []));
        validationResults.score = Math.min(validationResults.score, resumeValidation.score || 100);
        validationResults.isValid = validationResults.isValid && (resumeValidation.isValid !== false);
        
        if (resumeValidation.normalized) {
          validationResults.normalized = {
            ...validationResults.normalized,
            resume: resumeValidation.normalized
          };
        }
      } catch (e) {
        // Fallback validation
        const issues: Array<{type: "error" | "warning" | "info"; message: string}> = [];
        
        if (!/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(resumeContent)) {
          issues.push({ type: "error", message: "Missing email address" });
        }
        if (!/(experience|work history|employment)/i.test(resumeContent)) {
          issues.push({ type: "error", message: "Missing experience section" });
        }
        if (!/(education|degree|university)/i.test(resumeContent)) {
          issues.push({ type: "warning", message: "Missing education section" });
        }
        if (!/(skills|proficiencies)/i.test(resumeContent)) {
          issues.push({ type: "warning", message: "Missing skills section" });
        }
        
        validationResults.issues.push(...issues);
        validationResults.score = Math.max(0, 100 - (issues.length * 15));
        validationResults.isValid = issues.filter(i => i.type === "error").length === 0;
      }
    }

    // Job description validation
    if (validateJobDescription || (content && type === "job_description")) {
      const jobDescContent = jobDescription || content;
      
      const prompt = `
        Validate this job description for structure, completeness, and quality.
        
        Check for:
        1. Job title
        2. Company name
        3. Requirements or qualifications section
        4. Responsibilities or duties section
        5. Location information
        6. Application instructions
        7. Content quality and completeness
        
        Job Description:
        ${jobDescContent.substring(0, 8000)}
        
        Return ONLY a JSON object:
        {
          "isValid": <boolean>,
          "score": <number 0-100>,
          "issues": [
            {
              "type": "<error|warning|info>",
              "field": "<field name>",
              "message": "<issue description>",
              "suggestion": "<how to fix>"
            }
          ],
          "strengths": ["<strength1>", ...],
          "normalized": "<cleaned and normalized version if needed>"
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        const cleanedText = text
          .replace(/```(?:json)?\n?/g, '')
          .replace(/```\n?$/g, '')
          .trim();
        
        const jobDescValidation = JSON.parse(cleanedText);
        
        validationResults.issues.push(...(jobDescValidation.issues || []));
        validationResults.strengths.push(...(jobDescValidation.strengths || []));
        validationResults.score = Math.min(validationResults.score, jobDescValidation.score || 100);
        validationResults.isValid = validationResults.isValid && (jobDescValidation.isValid !== false);
        
        if (jobDescValidation.normalized) {
          validationResults.normalized = {
            ...validationResults.normalized,
            jobDescription: jobDescValidation.normalized
          };
        }
      } catch (e) {
        // Fallback validation
        const issues: Array<{type: "error" | "warning" | "info"; message: string}> = [];
        
        if (!/(requirements|qualifications|must have)/i.test(jobDescContent)) {
          issues.push({ type: "warning", message: "Missing requirements section" });
        }
        if (!/(responsibilities|duties|you will)/i.test(jobDescContent)) {
          issues.push({ type: "warning", message: "Missing responsibilities section" });
        }
        
        validationResults.issues.push(...issues);
        validationResults.score = Math.max(0, validationResults.score - (issues.length * 10));
      }
    }

    // Cross-validation if both provided
    if (validateBoth) {
      const crossValidationIssues: Array<{type: "error" | "warning" | "info"; message: string}> = [];
      
      // Check for basic compatibility
      if (resume.length < 100) {
        crossValidationIssues.push({ type: "error", message: "Resume is too short for meaningful analysis" });
      }
      if (jobDescription.length < 100) {
        crossValidationIssues.push({ type: "error", message: "Job description is too short for meaningful analysis" });
      }
      
      validationResults.issues.push(...crossValidationIssues);
      validationResults.isValid = validationResults.isValid && crossValidationIssues.filter(i => i.type === "error").length === 0;
      validationResults.score = Math.max(0, validationResults.score - (crossValidationIssues.length * 5));
    }

    // Calculate final score
    validationResults.score = Math.max(0, Math.min(100, validationResults.score));

    return NextResponse.json(validationResults);

  } catch (error) {
    console.error('Data Validator error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to validate data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

