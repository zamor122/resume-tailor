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

/**
 * Deterministically normalizes raw resume text:
 * 1. Ensures inline bullet characters (●, ○, •, ■, ▪, ✦, ★, -, *) start on their own line.
 * 2. Ensures standalone section headers (Summary, Experience, Education, Skills) are separated.
 * 3. Detects job headers containing dates when glued to preceding bullet text and separates them onto their own line.
 */
export function normalizeResumeText(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/[\r\n]+/g, "\n");

  // 1. Separate bullets onto their own lines (before anything else)
  // Non-dash bullet glyphs (●, ○, •, etc.) are always bullets
  text = text.replace(/([^\n])\s*([●○•■▪✦★\u2022\u25cf\u25cb\u25aa\u25ab])\s*/g, "$1\n• ");
  // Dash or asterisk bullets when inline only occur after sentence-ending punctuation
  text = text.replace(/([.!?])\s+[-*]\s+/g, "$1\n• ");

  // 2. Separate standalone section headers like Summary, Experience, Education, Skills
  text = text.replace(
    /(?:\b|\|)\s*(Summary|Professional Summary|Executive Summary)\s*(?:[:|\n]|\s+[●○•■▪✦★\-])/gi,
    "\n\n## Summary\n"
  );
  text = text.replace(
    /(?:^|[\n|])\s*(?:EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT HISTORY)\s*(?:[:|\n])/g,
    "\n## Experience\n"
  );
  text = text.replace(
    /(?:^|[\n|])\s*(?:EDUCATION|ACADEMIC BACKGROUND)\s*(?:[:|\n])/g,
    "\n## Education\n"
  );
  text = text.replace(
    /(?:^|[\n|])\s*(?:SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES)\s*(?:[:|\n])/g,
    "\n## Skills\n"
  );

  // 3. Separate Job Headers with Date Ranges onto their own lines
  const monthPattern = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  const dateRangePattern = new RegExp(
    `(\\|?\\s*${monthPattern}\\.?\\s+\\d{4}\\s*[-–—]\\s*(?:Present|Current|${monthPattern}\\.?\\s+\\d{4}|\\d{4}))`,
    "gi"
  );

  const rawLines = text.split("\n");
  const normalizedLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const match = trimmed.match(dateRangePattern);
    if (match) {
      const dateStr = match[0];
      const dateIndex = trimmed.lastIndexOf(dateStr);
      const lineBeforeDate = trimmed.slice(0, dateIndex).trim();

      const splitPoint = lineBeforeDate.search(/(?<=[.!?])\s+(?=[A-Z0-9][A-Za-z0-9\s&|—–-]{2,60})/);
      if (splitPoint !== -1) {
        const precedingBullet = lineBeforeDate.slice(0, splitPoint).trim();
        const jobHeader = lineBeforeDate.slice(splitPoint).trim() + " " + trimmed.slice(dateIndex).trim();
        if (precedingBullet) normalizedLines.push(precedingBullet);
        normalizedLines.push(jobHeader);
        continue;
      }
    }
    normalizedLines.push(trimmed);
  }

  return normalizedLines.join("\n");
}

export function parseResume(resumeText: string): ParsedResume {
  const normalized = normalizeResumeText(resumeText);
  const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);

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
  let emailMatch = normalized.match(emailRegex);
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
    phoneMatch = normalized.match(p);
    if (phoneMatch) break;
  }
  const linkedinMatch = normalized.match(/linkedin\.com\/in\/[\w-]+/i);
  const portfolioMatch = normalized.match(/(https?:\/\/)?(www\.)?[\w-]+\.(com|io|dev|net|org)/gi);

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
    const match = normalized.match(pattern);
    if (match) {
      location = match[0];
      break;
    }
  }
  
  // Detect sections
  const sectionHeaders: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /^(?:#+\s*)?(?:summary|profile|professional summary|executive summary|about|about me|career objective|objective|personal statement|career summary|background summary|professional profile)\b/i, name: 'Summary' },
    { pattern: /^(?:#+\s*)?(?:experience|work experience|employment history|employment|professional experience|work history|relevant experience|professional background|career history|work timeline|employment record|relevant work|work background)\b/i, name: 'Experience' },
    { pattern: /^(?:#+\s*)?(?:education|academic background|academic|education & certifications|education & training|academic history|degrees)\b/i, name: 'Education' },
    { pattern: /^(?:#+\s*)?(?:skills|technical skills|core competencies|skills & technologies|technical expertise|technical proficiencies|technical skills & tools|skills & abilities|areas of expertise|core strengths|technologies|tools & technologies)\b/i, name: 'Skills' },
    { pattern: /^(?:#+\s*)?(?:projects|key projects|personal projects|technical projects|notable projects|academic projects)\b/i, name: 'Projects' },
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

  const cleanHeaderLine = (line: string): string => {
    return line.trim().replace(/^([#*_~`>\s]+)/, "").replace(/([#*_~`:\s]+)$/, "").trim();
  };

  const isSectionHeader = (line: string): string | null => {
    const cleaned = cleanHeaderLine(line);
    for (const { pattern, name } of sectionHeaders) {
      if (pattern.test(line.trim()) || pattern.test(cleaned)) return name;
    }
    return null;
  };

  const isBullet = (line: string): boolean => {
    const trimmed = line.trim();
    return /^([-*•–—●○■▪✦★\u2022\u25cf\u25cb\u25aa\u25ab]|\d+\.)\s+/.test(trimmed) || /^[-*•–—●○■▪✦★\u2022\u25cf\u25cb\u25aa\u25ab]/.test(trimmed);
  };

  const monthPattern = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  const dateRangeRegex = new RegExp(
    `(\\|?\\s*${monthPattern}\\.?\\s+\\d{4}\\s*[-–—]\\s*(?:Present|Current|${monthPattern}\\.?\\s+\\d{4}|\\d{4}))`,
    "i"
  );
  
  // Extract summary: all lines between Summary header and next section header or first job
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
      const trimmed = line.trim();
      const hasDateRange = dateRangeRegex.test(trimmed);
      if (hasDateRange) {
        inSummary = false;
        break;
      }
      summaryLines.push(line);
      if (summaryLines.length >= 10) {
        inSummary = false;
        break;
      }
    }
  }
  if (summaryLines.length > 0) {
    summary = summaryLines.join('\n').trim();
  }

  // Extract experience: deterministically captures all jobs by date ranges or section
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

    if (sec && sec !== 'Experience') {
      inExperienceSection = false;
      if (currentExp) {
        experience.push(currentExp);
        currentExp = null;
      }
      continue;
    }

    // Check if line is a job header with date range (e.g. "Ticketmaster | LiveNation Technical Manager... | April 2026 – Present")
    const dateMatch = !isBullet(line) && line.match(dateRangeRegex);

    if (dateMatch) {
      const dateStr = dateMatch[0].replace(/^\|\s*/, "").trim();
      const beforeDate = line.replace(dateMatch[0], "").trim().replace(/\|\s*$/, "").trim();

      // If line is ONLY the date range, assign to preceding job title/company line
      if (beforeDate.length === 0 && currentExp && !currentExp.dates && !currentExp.description) {
        currentExp.dates = dateStr;
        continue;
      }

      inExperienceSection = true;
      if (currentExp) {
        experience.push(currentExp);
      }

      let company = beforeDate;
      let title = beforeDate;
      if (beforeDate.includes("|")) {
        const parts = beforeDate.split("|").map(p => p.trim());
        company = parts[0];
        title = parts.slice(1).join(" - ");
      } else if (beforeDate.includes(" - ") || beforeDate.includes(" — ") || beforeDate.includes(" – ")) {
        const parts = beforeDate.split(/\s+[-—–]\s+/).map(p => p.trim());
        const isPart2Title = /(Engineer|Developer|Architect|Manager|Director|Lead|Consultant|Analyst|Designer|Admin|Specialist)\b/i.test(parts[1] || "");
        if (isPart2Title) {
          company = parts[0];
          title = parts.slice(1).join(" - ");
        } else {
          title = parts[0];
          company = parts.slice(1).join(" - ");
        }
      } else {
        const titleMatch = beforeDate.match(/(.+?)\s+(Senior|Lead|Principal|Staff|Full Stack|Software|Technical|Engineering|Frontend|Backend|Mobile|Cloud|DevOps|Product|Project|Architect|Manager|Director|Engineer|Developer|Specialist)\b(.*)/i);
        if (titleMatch) {
          company = titleMatch[1].trim();
          title = `${titleMatch[2]}${titleMatch[3]}`.trim();
        }
      }

      currentExp = {
        title: title || company,
        company: company || "Company",
        dates: dateStr,
        location: null,
        description: '',
      };
      continue;
    }

    if (inExperienceSection || currentExp) {
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

      // Check if line is a date range for previous job header
      const standaloneDateMatch = line.match(dateRangeRegex);
      if (standaloneDateMatch && currentExp && !currentExp.dates && !currentExp.description) {
        currentExp.dates = line.trim();
        continue;
      }

      // Check if line looks like a job header:
      // Pattern 1: Title - Company - Dates OR Company - Title (Dates)
      const dashMatch = line.match(/^(.+?)\s+[-–—]\s+(.+?)(?:\s+[-–—]\s+(.+?))?$/);
      // Pattern 2: Title at Company (Dates)
      const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*\((.+?)\))?$/i);

      if (dashMatch) {
        if (currentExp) experience.push(currentExp);
        const isPart2Title = /(Engineer|Developer|Architect|Manager|Director|Lead|Consultant|Analyst|Designer|Admin|Specialist)\b/i.test(dashMatch[2] || "");
        const comp = isPart2Title ? dashMatch[1].trim() : dashMatch[2].trim();
        const titl = isPart2Title ? dashMatch[2].trim() : dashMatch[1].trim();

        currentExp = {
          title: titl,
          company: comp,
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
      } else if (standaloneDateMatch && currentExp && !currentExp.dates && !currentExp.description) {
        currentExp.dates = line.trim();
      } else if (!isBullet(line) && line.length < 100 && (i + 1 < lines.length && (isBullet(lines[i + 1]) || standaloneDateMatch))) {
        if (currentExp) experience.push(currentExp);
        currentExp = {
          title: line.trim(),
          company: line.trim(),
          dates: null,
          location: null,
          description: '',
        };
      } else if (currentExp && line.length > 0) {
        if (currentExp.description && !isBullet(line)) {
          const descLines = currentExp.description.split("\n");
          const lastLine = descLines[descLines.length - 1];
          const isContinuation =
            isBullet(lastLine) &&
            (/^[a-z]/.test(line.trim()) || !/[.!?]$/.test(lastLine.trim()));
          if (isContinuation) {
            currentExp.description += ` ${line.trim()}`;
            continue;
          }
        }
        if (line.length > 5) {
          currentExp.description += (currentExp.description ? '\n' : '') + (isBullet(line) ? line : `- ${line}`);
        }
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
