/**
 * Parse resume markdown (after dedupe) into a flat structure for React-PDF rendering.
 */

import { deduplicateResumeSections } from "./resumeSectionDedupe";

/** Strip inline markdown to plain text for PDF. */
function stripInline(text: string): string {
  let t = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return t.trim();
}

export type ResumeBlock =
  | { type: "name"; text: string }
  | { type: "section"; text: string }
  | { type: "subsection"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

export function markdownToResumeBlocks(markdown: string): ResumeBlock[] {
  const deduped = deduplicateResumeSections(markdown);
  const lines = deduped.replace(/\r\n/g, "\n").split("\n");
  const blocks: ResumeBlock[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      inList = false;
      continue;
    }

    if (/^#\s+[^#]/.test(trimmed) && !/^##\s/.test(trimmed)) {
      inList = false;
      blocks.push({ type: "name", text: stripInline(trimmed.replace(/^#\s+/, "")) });
      continue;
    }
    if (/^##\s+[^#]/.test(trimmed) && !/^###\s/.test(trimmed)) {
      inList = false;
      blocks.push({ type: "section", text: stripInline(trimmed.replace(/^##\s+/, "")) });
      continue;
    }
    if (/^###\s/.test(trimmed)) {
      inList = false;
      blocks.push({ type: "subsection", text: stripInline(trimmed.replace(/^#+\s+/, "")) });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      inList = true;
      const text = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
      blocks.push({ type: "bullet", text: stripInline(text) });
      continue;
    }
    inList = false;
    blocks.push({ type: "paragraph", text: stripInline(trimmed) });
  }

  return blocks;
}
