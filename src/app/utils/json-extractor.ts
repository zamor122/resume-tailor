/**
 * Extracts JSON from text that may contain reasoning or other text before/after the JSON
 */
export function extractJSONFromText(text: string): string | null {
  if (!text) return null;

  // First, try to find JSON wrapped in code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object starting with {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const potentialJson = jsonMatch[0];
    
    // Validate it's valid JSON by trying to parse it
    try {
      JSON.parse(potentialJson);
      return potentialJson;
    } catch {
      // Not valid JSON, continue to other methods
    }
  }

  // Try to find JSON array starting with [
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const potentialJson = arrayMatch[0];
    try {
      JSON.parse(potentialJson);
      return potentialJson;
    } catch {
      // Not valid JSON
    }
  }

  // Last resort: try to extract text between first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = text.substring(firstBrace, lastBrace + 1);
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
  let jsonString = extractJSONFromText(text);
  
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





