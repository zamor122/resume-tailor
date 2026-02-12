/**
 * Deduplicate resume markdown by section header.
 * Keeps the first occurrence of each section (by normalized title); drops later duplicates.
 */

/** Normalize section title for comparison (lowercase, collapse spaces, common aliases). */
function normalizeSectionKey(title: string): string {
  let key = title.trim().toLowerCase().replace(/\s+/g, " ");
  const aliases: [RegExp, string][] = [
    [/^work\s+experience$/, "experience"],
    [/^professional\s+experience$/, "experience"],
    [/^relevant\s+experience$/, "experience"],
    [/^experience$/, "experience"],
    [/^employment$/, "experience"],
    [/^technical\s+skills$/, "skills"],
    [/^core\s+competencies$/, "skills"],
    [/^key\s+skills$/, "skills"],
    [/^skills$/, "skills"],
    [/^summary$/, "summary"],
    [/^objective$/, "summary"],
    [/^professional\s+summary$/, "summary"],
    [/^profile$/, "summary"],
    [/^education$/, "education"],
    [/^academic$/, "education"],
    [/^projects$/, "projects"],
    [/^certifications?$/, "certifications"],
  ];
  for (const [re, canonical] of aliases) {
    if (re.test(key)) return canonical;
  }
  return key;
}

/**
 * Returns markdown with duplicate sections removed.
 * Sections are identified by ## or # headers; the first occurrence of each
 * (normalized) section title is kept, later duplicates are dropped.
 */
export function deduplicateResumeSections(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) return markdown;

  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  // Split before any line that starts with # (header). Keeps content before first header as one chunk.
  const chunks = normalized.split(/\n(?=#+\s)/);

  const seen = new Set<string>();
  const kept: string[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split("\n")[0];
    const isHeader = /^#+\s/.test(firstLine);

    if (!isHeader) {
      // Preamble (e.g. contact before any ##) — keep as-is
      kept.push(trimmed);
      continue;
    }

    const title = firstLine.replace(/^#+\s*/, "").trim();
    const key = normalizeSectionKey(title);

    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(trimmed);
  }

  return kept.join("\n\n").trim();
}
