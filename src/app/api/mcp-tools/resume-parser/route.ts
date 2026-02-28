import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 10;

interface ParsedResume {
  contactInfo: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    portfolio: string | null;
  };
  sections: string[];
  experience: Array<{
    title: string;
    company: string;
    dates: string | null;
    location: string | null;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    field: string | null;
    dates: string | null;
    gpa: string | null;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  summary: string | null;
}

function parseResume(resumeText: string): ParsedResume {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // First block (before any ##) for contact parsing
  let firstBlockEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^#+\s+/.test(lines[i])) {
      firstBlockEnd = i;
      break;
    }
  }
  const firstBlockLines = lines.slice(0, firstBlockEnd);
  const firstBlockText = firstBlockLines.join("\n");

  // Extract contact info (whole-doc patterns first)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  let emailMatch = resumeText.match(emailRegex);
  if (!emailMatch && /email:\s*|e-mail:\s*/i.test(firstBlockText)) {
    const prefixed = firstBlockText.match(/(?:email|e-mail):\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/i);
    if (prefixed) emailMatch = [prefixed[1]];
  }
  const phonePatterns = [
    /(?:ph\.?|tel\.?|phone):\s*((?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\d{10}/,
  ];
  let phoneMatch: RegExpMatchArray | null = null;
  for (const p of phonePatterns) {
    phoneMatch = resumeText.match(p);
    if (phoneMatch) break;
  }
  const linkedinMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
  const portfolioMatch = resumeText.match(/(https?:\/\/)?(www\.)?[\w-]+\.(com|io|dev|net|org)/gi);

  // Extract name: first line that looks like a name, or line before "Email:" / "Ph:"
  let name: string | null = null;
  for (let i = 0; i < Math.min(5, firstBlockLines.length); i++) {
    const line = firstBlockLines[i];
    if (line.length > 5 && line.length < 50 && !emailMatch?.includes(line) && !phoneMatch?.includes(line)) {
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const allCapitalized = words.every(w => w.length > 0 && w[0] === w[0].toUpperCase());
        if (allCapitalized && !/^https?:\/\//i.test(line) && !/@/.test(line)) {
          name = line;
          break;
        }
      }
    }
  }
  if (!name) {
    for (let i = 0; i < firstBlockLines.length; i++) {
      const line = firstBlockLines[i];
      if (/^(email|e-mail|ph\.?|tel\.?|phone):/i.test(line) && i > 0) {
        const prev = firstBlockLines[i - 1].trim();
        if (prev.length >= 4 && prev.length <= 50 && !/@/.test(prev) && !/^\d/.test(prev)) {
          name = prev;
          break;
        }
      }
    }
  }

  // Extract location (common patterns)
  const locationPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/, // City, State
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b/, // City, Country
  ];
  let location: string | null = null;
  for (const pattern of locationPatterns) {
    const match = resumeText.match(pattern);
    if (match) {
      location = match[0];
      break;
    }
  }
  
  // Detect sections
  const sectionHeaders = [
    /^(summary|profile|objective|about)/i,
    /^(experience|work experience|employment|professional experience)/i,
    /^(education|academic)/i,
    /^(skills|technical skills|core competencies)/i,
    /^(projects|portfolio)/i,
    /^(certifications|certificates)/i,
    /^(awards|achievements|honors)/i,
  ];
  
  const sections: string[] = [];
  lines.forEach((line, idx) => {
    sectionHeaders.forEach((pattern, i) => {
      if (pattern.test(line)) {
        const sectionNames = ['Summary', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications', 'Awards'];
        if (!sections.includes(sectionNames[i])) {
          sections.push(sectionNames[i]);
        }
      }
    });
  });
  
  // Extract experience
  const experience: ParsedResume['experience'] = [];
  const experiencePattern = /^(.+?)\s+[-–—]\s+(.+?)(?:\s+[-–—]\s+(.+?))?$/;
  
  let inExperienceSection = false;
  let currentExp: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect experience section
    if (/^(experience|work experience|employment)/i.test(line)) {
      inExperienceSection = true;
      continue;
    }
    
    if (inExperienceSection) {
      // Check if this looks like a job entry (title - company - dates)
      const match = line.match(/^(.+?)\s+[-–—]\s+(.+?)(?:\s+[-–—]\s+(.+?))?$/);
      if (match) {
        if (currentExp) {
          experience.push(currentExp);
        }
        currentExp = {
          title: match[1].trim(),
          company: match[2].trim(),
          dates: match[3]?.trim() || null,
          location: null,
          description: '',
        };
      } else if (currentExp && line.length > 10) {
        // Accumulate description
        currentExp.description += (currentExp.description ? ' ' : '') + line;
      }
    }
  }
  if (currentExp) {
    experience.push(currentExp);
  }
  
  // Extract education
  const education: ParsedResume['education'] = [];
  let inEducationSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (/^(education|academic)/i.test(line)) {
      inEducationSection = true;
      continue;
    }
    
    if (inEducationSection) {
      // Look for degree patterns
      const degreeMatch = line.match(/\b(B\.?S\.?|B\.?A\.?|B\.?E\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?|Doctorate)\b/i);
      if (degreeMatch) {
        const parts = line.split(/[-–—,]/).map(p => p.trim());
        education.push({
          degree: parts[0] || line,
          institution: parts[1] || '',
          field: parts[2] || null,
          dates: parts.find(p => /\d{4}/.test(p)) || null,
          gpa: line.match(/GPA[:\s]+([\d.]+)/i)?.[1] || null,
        });
      }
    }
  }
  
  // Extract skills
  const skills: ParsedResume['skills'] = {
    technical: [],
    soft: [],
    languages: [],
    certifications: [],
  };
  
  let inSkillsSection = false;
  const technicalKeywords = ['javascript', 'python', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'java', 'typescript'];
  const softKeywords = ['leadership', 'communication', 'teamwork', 'problem solving', 'collaboration'];
  
  for (const line of lines) {
    if (/^(skills|technical skills)/i.test(line)) {
      inSkillsSection = true;
      continue;
    }
    
    if (inSkillsSection) {
      // Split by common delimiters
      const skillItems = line.split(/[,;•·]/).map(s => s.trim()).filter(s => s.length > 0);
      skillItems.forEach(skill => {
        const lowerSkill = skill.toLowerCase();
        if (technicalKeywords.some(kw => lowerSkill.includes(kw))) {
          if (!skills.technical.includes(skill)) {
            skills.technical.push(skill);
          }
        } else if (softKeywords.some(kw => lowerSkill.includes(kw))) {
          if (!skills.soft.includes(skill)) {
            skills.soft.push(skill);
          }
        }
      });
    }
  }
  
  // Extract summary (usually first paragraph after name)
  let summary: string | null = null;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.length > 50 && line.length < 500 && !emailMatch?.includes(line) && !phoneMatch?.includes(line)) {
      if (/^(summary|profile|objective)/i.test(lines[i - 1] || '') || i < 3) {
        summary = line;
        break;
      }
    }
  }
  
  const phoneValue = phoneMatch ? (phoneMatch[1] ?? phoneMatch[0]) : null;
  return {
    contactInfo: {
      name,
      email: emailMatch?.[0] || null,
      phone: phoneValue || null,
      location,
      linkedin: linkedinMatch?.[0] || null,
      portfolio: portfolioMatch?.[0] || null,
    },
    sections,
    experience,
    education,
    skills,
    summary,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { resume } = await req.json();
    
    if (!resume || resume.length < 50) {
      return NextResponse.json(
        { error: "Invalid Input", message: "Resume is required (minimum 50 characters)" },
        { status: 400 }
      );
    }
    
    const result = parseResume(resume);
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Resume Parser error:', error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to parse resume",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





