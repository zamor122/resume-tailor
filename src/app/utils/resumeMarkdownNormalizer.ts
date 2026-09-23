/**
 * Utility to normalize raw resume text into clean, structured markdown.
 * Guarantees that resumes never render as unformatted blobs of text,
 * regardless of whether the source was extracted from a PDF, pasted as plain text,
 * or provided without markdown headers.
 */

const SECTION_PATTERNS: { regex: RegExp; canonical: string }[] = [
  {
    regex: /^(summary|professional\s+summary|executive\s+summary|career\s+summary|profile|professional\s+profile|about\s+me|about)\b[:\s]*$/i,
    canonical: "Summary",
  },
  {
    regex: /^(experience|work\s+experience|professional\s+experience|employment\s+history|work\s+history|career\s+history)\b[:\s]*$/i,
    canonical: "Experience",
  },
  {
    regex: /^(skills|technical\s+skills|core\s+competencies|key\s+skills|proficiencies|technologies|areas\s+of\s+expertise|technical\s+proficiencies)\b[:\s]*$/i,
    canonical: "Skills",
  },
  {
    regex: /^(education|academic\s+background|academic\s+history|education\s+and\s+training|education\s+&\s+credentials)\b[:\s]*$/i,
    canonical: "Education",
  },
  {
    regex: /^(projects|key\s+projects|technical\s+projects|notable\s+projects|personal\s+projects)\b[:\s]*$/i,
    canonical: "Projects",
  },
  {
    regex: /^(certifications|licenses\s+&\s+certifications|certifications\s+&\s+licenses|credentials)\b[:\s]*$/i,
    canonical: "Certifications",
  },
  {
    regex: /^(awards|honors\s+&\s+awards|achievements|volunteer\s+experience|publications)\b[:\s]*$/i,
    canonical: "Awards",
  },
];

const BULLET_PREFIX_REGEX = /^[-*•–—▪►✓✔\u2022\u2023\u25E6\u2043\u2219]\s+|\d+[.)]\s+/;

function matchSectionHeading(line: string): { matched: boolean; heading: string } | null {
  const clean = line.replace(/^#+\s*/, "").trim();
  for (const { regex } of SECTION_PATTERNS) {
    if (regex.test(clean)) {
      // Preserve the user's phrasing in title case, or clean format
      const formatted = clean
        .replace(/[:\s]+$/, "")
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      return { matched: true, heading: formatted };
    }
  }
  return null;
}

function isDateOrLocationLine(line: string): boolean {
  const clean = line.trim();
  // Starts with year or month: e.g. "2021 - Present" or "Jan 2020 - Present"
  if (/^(\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(clean)) {
    return true;
  }
  // Check if line is purely dates and location
  const stripped = clean.replace(/\b(19\d\d|20\d\d|present|current|to|–|-|—|\||•|,|\s+)\b/gi, "").trim();
  if (stripped.length <= 20 && /^[a-zA-Z\s,.]+$/.test(stripped)) {
    return true;
  }
  return false;
}

function isJobSubheading(line: string): boolean {
  const clean = line.replace(/^###\s*/, "").trim();
  if (!clean || BULLET_PREFIX_REGEX.test(clean)) return false;
  if (clean.length > 130) return false;

  const isExistingH3 = /^###\s+/.test(line.trim());
  if (isExistingH3) return true;

  // Never promote pure date/location lines to H3
  if (isDateOrLocationLine(clean)) return false;

  // Indicators: company/title separators (e.g. "Google – Senior Software Engineer") or job title keywords
  const hasSeparator = /\s+[-–—|•]\s+/.test(clean);
  const titleKeywords = /\b(engineer|developer|manager|director|lead|specialist|analyst|architect|consultant|officer|associate|intern|administrator|designer|technician|coordinator|supervisor|founder|vp|head|president)\b/i;

  return hasSeparator || titleKeywords.test(clean);
}

function isContactLike(line: string): boolean {
  return /@|https?:\/\/|www\.|\.com\b|\.org\b|\.edu\b|\d{3}[\-.\s]?\d{3}[\-.\s]?\d{4}/i.test(line);
}

export function normalizeResumeMarkdown(rawText: string): string {
  if (!rawText || !rawText.trim()) return "";

  const lines = rawText.split(/\r?\n/);
  const output: string[] = [];
  let foundFirstHeader = false;
  let inExperience = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      output.push("");
      continue;
    }

    // Check if line is already an H1
    if (/^#\s+/.test(trimmed)) {
      output.push(trimmed);
      continue;
    }

    // Check if line matches a major section heading
    const sectionMatch = matchSectionHeading(trimmed);
    if (sectionMatch) {
      foundFirstHeader = true;
      inExperience = /experience/i.test(sectionMatch.heading);
      output.push(`\n## ${sectionMatch.heading}\n`);
      continue;
    }

    // Before the first section header: check if line 0 looks like the candidate's name
    if (!foundFirstHeader && output.length === 0) {
      if (!isContactLike(trimmed) && trimmed.length < 60 && !trimmed.startsWith("#")) {
        output.push(`# ${trimmed}`);
        continue;
      }
    }

    // Inside Experience: check for job titles / company subheadings
    if (inExperience && isJobSubheading(trimmed)) {
      const cleanTitle = trimmed.replace(/^#+\s*/, "").trim();
      output.push(`\n### ${cleanTitle}\n`);
      continue;
    }

    // Check for bullet points
    if (BULLET_PREFIX_REGEX.test(trimmed)) {
      const content = trimmed.replace(BULLET_PREFIX_REGEX, "").trim();
      output.push(`- ${content}`);
      continue;
    }

    // Regular line (e.g. contact info, summary paragraph text, etc.)
    output.push(rawLine);
  }

  // Join and collapse 3+ newlines into 2
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
