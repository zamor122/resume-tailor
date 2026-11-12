/**
 * Extracts JSON from text that may contain reasoning or other text before/after the JSON
 */
export function extractJSONFromText(text: string): string | null {
  if (!text) return null;

  // Strip markdown code fences up front — including an UNCLOSED leading fence
  // ("```json\n[...") that models emit when streamed/truncated output is cut
  // before the closing fence. Without this the brace/bracket matchers never fire
  // and we needlessly fall back to lossy line-based parsing.
  const deFenced = text
    .replace(/^\s*```[a-zA-Z]*\s*\r?\n?/, "")
    .replace(/\r?\n?```\s*$/, "");
  const trimmed = deFenced.trim();

  // Prefer the container the payload actually opens with. Bullet output is an
  // array, so a leading "[" must win over a stray inner object (or we'd return
  // the first object and silently drop the rest of the list).
  const patterns = trimmed.startsWith("[")
    ? [/\[[\s\S]*\]/, /\{[\s\S]*\}/]
    : [/\{[\s\S]*\}/, /\[[\s\S]*\]/];

  for (const pattern of patterns) {
    const match = deFenced.match(pattern);
    if (match) {
      try {
        JSON.parse(match[0]);
        return match[0];
      } catch {
        // Not valid JSON — try the next container shape.
      }
    }
  }

  // Last resort: slice from first { to last }.
  const firstBrace = deFenced.indexOf("{");
  const lastBrace = deFenced.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = deFenced.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(extracted);
      return extracted;
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

/** Fix common LLM JSON errors (e.g. unquoted "thirty" instead of 30) */
function fixCommonJsonErrors(jsonString: string): string {
  return jsonString
    // Fix unquoted number words in improvementMetrics
    .replace(/"atsKeywordsMatched"\s*:\s*(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)/gi, (_, word) => {
      const map: Record<string, string> = {
        zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
        six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
        eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15",
        twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60",
        seventy: "70", eighty: "80", ninety: "90", hundred: "100",
      };
      return `"atsKeywordsMatched": ${map[word.toLowerCase()] ?? "0"}`;
    });
}

/**
 * Safely parses JSON from text that may contain reasoning or other content
 */
export function parseJSONFromText<T = any>(text: string): T | null {
  const jsonString = extractJSONFromText(text);
  
  if (!jsonString) {
    return null;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    // Try fixing common LLM errors before failing
    const fixed = fixCommonJsonErrors(jsonString);
    try {
      return JSON.parse(fixed) as T;
    } catch (error) {
      console.error('Failed to parse extracted JSON:', error);
      return null;
    }
  }
}

/**
 * Attempts to extract tailoredResume from malformed LLM output when full JSON parse fails.
 * Used as fallback to avoid passing raw JSON blobs to obfuscation.
 */
export function extractTailoredResumeFromText(text: string): string | null {
  if (!text || text.length < 50) return null;
  // Match "tailoredResume": "..." (s flag for multiline)
  const match = text.match(/"tailoredResume"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (match) {
    return match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return null;
}





