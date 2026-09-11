export interface ParsedResume {
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

export function parseResume(resumeText: string): ParsedResume {
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
  const sectionHeaders: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /^(?:#+\s*)?(?:summary|profile|professional summary|executive summary|about|about me|career objective|objective)\b/i, name: 'Summary' },
    { pattern: /^(?:#+\s*)?(?:experience|work experience|employment history|employment|professional experience|work history|relevant experience)\b/i, name: 'Experience' },
    { pattern: /^(?:#+\s*)?(?:education|academic background|academic|education & certifications)\b/i, name: 'Education' },
    { pattern: /^(?:#+\s*)?(?:skills|technical skills|core competencies|skills & technologies|technical expertise)\b/i, name: 'Skills' },
    { pattern: /^(?:#+\s*)?(?:projects|key projects|personal projects|technical projects)\b/i, name: 'Projects' },
    { pattern: /^(?:#+\s*)?(?:certifications|certificates|licenses)\b/i, name: 'Certifications' },
    { pattern: /^(?:#+\s*)?(?:awards|achievements|honors)\b/i, name: 'Awards' },
  ];
  
  const sections: string[] = [];
  lines.forEach((line) => {
    sectionHeaders.forEach(({ pattern, name }) => {
      if (pattern.test(line) && !sections.includes(name)) {
        sections.push(name);
      }
    });
  });

  const isSectionHeader = (line: string): string | null => {
    for (const { pattern, name } of sectionHeaders) {
      if (pattern.test(line.trim())) return name;
    }
    return null;
  };

  const isBullet = (line: string): boolean => {
    const trimmed = line.trim();
    return /^([-*•–—]|\d+\.)\s+/.test(trimmed) || /^[-*•–—]/.test(trimmed);
  };
  
  // Extract summary: all lines between Summary header and next section header
  let summary: string | null = null;
  let inSummary = false;
  const summaryLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sec = isSectionHeader(line);
    if (sec === 'Summary') {
      inSummary = true;
      continue;
    }
    if (inSummary) {
      if (sec && sec !== 'Summary') {
        inSummary = false;
        break;
      }
      summaryLines.push(line);
    }
  }
  if (summaryLines.length > 0) {
    summary = summaryLines.join('\n').trim();
  }

  // Extract experience
  const experience: ParsedResume['experience'] = [];
  let inExperienceSection = false;
  let currentExp: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sec = isSectionHeader(line);

    if (sec === 'Experience') {
      inExperienceSection = true;
      continue;
    }

    if (inExperienceSection) {
      if (sec && sec !== 'Experience') {
        inExperienceSection = false;
        if (currentExp) {
          experience.push(currentExp);
          currentExp = null;
        }
        continue;
      }

      // Check if this line is a bullet point under current job
      if (isBullet(line)) {
        if (!currentExp) {
          currentExp = {
            title: 'Software Engineer',
            company: 'Experience',
            dates: null,
            location: null,
            description: '',
          };
        }
        currentExp.description += (currentExp.description ? '\n' : '') + line;
        continue;
      }

      // Check if line looks like a job header:
      // Pattern 1: Title - Company - Dates OR Company - Title (Dates)
      const dashMatch = line.match(/^(.+?)\s+[-–—]\s+(.+?)(?:\s+[-–—]\s+(.+?))?$/);
      // Pattern 2: Title at Company (Dates)
      const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*\((.+?)\))?$/i);
      // Pattern 3: Line containing dates (e.g. April 2026 - Present, 2018 - 2022)
      const dateRangeMatch = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\d{4}\s*[-–—]\s*(?:Present|Current|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\d{4})/i);

      if (dashMatch) {
        if (currentExp) experience.push(currentExp);
        currentExp = {
          title: dashMatch[1].trim(),
          company: dashMatch[2].trim(),
          dates: dashMatch[3]?.trim() || null,
          location: null,
          description: '',
        };
      } else if (atMatch) {
        if (currentExp) experience.push(currentExp);
        currentExp = {
          title: atMatch[1].trim(),
          company: atMatch[2].trim(),
          dates: atMatch[3]?.trim() || null,
          location: null,
          description: '',
        };
      } else if (dateRangeMatch && currentExp && !currentExp.dates && !currentExp.description) {
        // Line is the date for the preceding job title/company line
        currentExp.dates = line.trim();
      } else if (!isBullet(line) && line.length < 100 && (i + 1 < lines.length && (isBullet(lines[i + 1]) || dateRangeMatch))) {
        // Line is a job title / company name header
        if (currentExp) experience.push(currentExp);
        currentExp = {
          title: line.trim(),
          company: line.trim(),
          dates: null,
          location: null,
          description: '',
        };
      } else if (currentExp && line.length > 5) {
        currentExp.description += (currentExp.description ? '\n' : '') + (isBullet(line) ? line : `- ${line}`);
      }
    }
  }

  if (currentExp) {
    experience.push(currentExp);
  }

  // Fallback: If no experience section was found, extract bullet clusters as experience
  if (experience.length === 0) {
    const allBullets = lines.filter(isBullet);
    if (allBullets.length > 0) {
      experience.push({
        title: 'Professional Experience',
        company: 'Experience',
        dates: null,
        location: null,
        description: allBullets.join('\n'),
      });
    }
  }
  
  // Extract education
  const education: ParsedResume['education'] = [];
  let inEducationSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sec = isSectionHeader(line);

    if (sec === 'Education') {
      inEducationSection = true;
      continue;
    }
    
    if (inEducationSection) {
      if (sec && sec !== 'Education') {
        inEducationSection = false;
        continue;
      }

      const degreeMatch = line.match(/\b(B\.?S\.?|B\.?A\.?|B\.?E\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?|Bachelor|Master|Doctorate)\b/i);
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
  const technicalKeywords = ['javascript', 'python', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'java', 'typescript', 'graphql', 'next.js', 'redis', 'postgres', 'mongodb', 'ci/cd', 'git'];
  const softKeywords = ['leadership', 'communication', 'teamwork', 'problem solving', 'collaboration', 'management', 'mentoring', 'strategic'];
  
  for (const line of lines) {
    const sec = isSectionHeader(line);
    if (sec === 'Skills') {
      inSkillsSection = true;
      continue;
    }
    if (inSkillsSection) {
      if (sec && sec !== 'Skills') {
        inSkillsSection = false;
        continue;
      }
      const skillItems = line.split(/[,;•·|\n]/).map(s => s.replace(/^[-*•–—\s]+/, '').trim()).filter(s => s.length > 0 && s.length < 50);
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

  // Fallback summary if not found under Summary header: first paragraph
  if (!summary) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      const isContactLine = emailRegex.test(line) || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line);
      if (line.length > 30 && line.length < 1000 && !isContactLine && !isSectionHeader(line)) {
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
