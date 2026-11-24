import { parseJSONFromText } from "@/app/utils/json-extractor";

export interface BlogPostPayload {
  title?: string;
  slug?: string;
  description?: string;
  summary?: string;
  body?: string;
}

export function isValidBlogPayload(p: BlogPostPayload | null | undefined): p is Required<BlogPostPayload> {
  return Boolean(
    p &&
      typeof p.title === "string" &&
      p.title.trim().length > 0 &&
      typeof p.slug === "string" &&
      p.slug.trim().length > 0 &&
      typeof p.description === "string" &&
      p.description.trim().length > 0 &&
      typeof p.summary === "string" &&
      p.summary.trim().length > 0 &&
      typeof p.body === "string" &&
      p.body.trim().length > 0
  );
}

function unescapeJsonString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

/**
 * Extracts a single-line JSON string field like `"title": "..."` even when
 * another field (typically `"body"`) contains unescaped newlines that break JSON.parse.
 */
function extractSingleLineField(text: string, field: string): string | undefined {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m");
  const match = text.match(re);
  return match ? unescapeJsonString(match[1]) : undefined;
}

/**
 * Extracts the `"body"` field from a JSON-like LLM response when unescaped newlines
 * or internal quotes break standard JSON.parse.
 */
function extractBodyField(text: string): string | undefined {
  const startMatch = text.match(/"body"\s*:\s*"/);
  if (!startMatch || startMatch.index === undefined) return undefined;
  const startIdx = startMatch.index + startMatch[0].length;
  const remainder = text.slice(startIdx);

  // Find the closing quote right before the final closing brace `}`
  const endMatch = remainder.match(/"\s*,?\s*\}\s*(?:```\s*)?$/);
  if (!endMatch || endMatch.index === undefined) return undefined;

  return unescapeJsonString(remainder.slice(0, endMatch.index));
}

/**
 * Resiliently parses an LLM-generated blog post response.
 * 1. Standard JSON extraction via `parseJSONFromText`
 * 2. Field-level fallback for JSON with unescaped newlines/quotes inside `"body"`
 */
export function parseBlogPostResponse(text: string): Required<BlogPostPayload> | null {
  if (!text || !text.trim()) return null;

  // 1. Standard valid JSON path
  const direct = parseJSONFromText<BlogPostPayload>(text);
  if (isValidBlogPayload(direct)) {
    return {
      title: direct.title.trim(),
      slug: direct.slug.trim(),
      description: direct.description.trim(),
      summary: direct.summary.trim(),
      body: direct.body.trim(),
    };
  }

  // 2. Fallback: recover fields when `"body"` contains unescaped literal newlines/quotes
  const deFenced = text
    .replace(/^\s*```[a-zA-Z]*\s*\r?\n?/, "")
    .replace(/\r?\n?```\s*$/, "")
    .trim();

  const title = extractSingleLineField(deFenced, "title");
  const slug = extractSingleLineField(deFenced, "slug");
  const description = extractSingleLineField(deFenced, "description");
  const summary = extractSingleLineField(deFenced, "summary");
  const body = extractBodyField(deFenced);

  const recovered: BlogPostPayload = { title, slug, description, summary, body };
  if (isValidBlogPayload(recovered)) {
    return {
      title: recovered.title.trim(),
      slug: recovered.slug.trim(),
      description: recovered.description.trim(),
      summary: recovered.summary.trim(),
      body: recovered.body.trim(),
    };
  }

  return null;
}
