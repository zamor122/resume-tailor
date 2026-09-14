/**
 * Utility to strip model thinking blocks, reasoning traces, chain-of-thought tokens,
 * and meta-prompt preambles from model outputs.
 *
 * Reasoning models (e.g., DeepSeek R1, Qwen 2.5/3, Cerebras GPT-OSS 120B, Groq)
 * frequently output thinking tokens (<think>...</think>, <thought>...</thought>, etc.)
 * or meta-analysis preambles (*Analyze User Input:**) before the intended response.
 */

// Matches closed thinking/reasoning tags
const CLOSED_THINKING_REGEX = /<(?:think|thought|reasoning|cot)>[\s\S]*?<\/(?:think|thought|reasoning|cot)>/gi;

// Matches unclosed thinking tag at start of text that cuts off or has content after it
const UNCLOSED_THINKING_START_REGEX = /^\s*<(?:think|thought|reasoning|cot)>[\s\S]*?(?:(?=\n\n(?:\[|\{|[-*•–—●○■▪✦★◦▸]|\d+\.))|(?=\n\s*(?:\[|\{)))/i;

// Matches leftover unclosed thinking tag if it spans to end of string without closing tag
const UNCLOSED_THINKING_REST_REGEX = /<(?:think|thought|reasoning|cot)>[\s\S]*$/i;

// Matches standalone thinking/preamble header lines that should never appear in tailored content
const PREAMBLE_LINE_PATTERNS: RegExp[] = [
  /^\s*Here'?s a thinking process:?\s*$/i,
  /^\s*Thinking Process:?\s*$/i,
  /^\s*Reasoning Process:?\s*$/i,
  /^\s*Thinking:?\s*$/i,
  /^\s*\*+\s*Analyze (?:User )?Input:?\*+\s*$/i,
  /^\s*#{1,6}\s*Analyze (?:User )?Input:?\s*$/i,
  /^\s*\*+\s*Step \d+:.*?\*+\s*$/i,
  /^\s*#{1,6}\s*Step \d+:.*$/i,
  /^\s*\*+\s*Thought:?\*+\s*$/i,
  /^\s*\*+\s*Reasoning:?\*+\s*$/i,
  /^\s*(?:Certainly!|Sure!|Here (?:is|are) the (?:tailored|enhanced|updated) (?:bullets?|resume|suggestions?|summary):?)\s*$/i,
];

/**
 * Checks whether a single line is a thinking/preamble artifact rather than resume content.
 */
export function isThinkingOrPreamble(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^<\/?(?:think|thought|reasoning|cot)>/i.test(trimmed)) {
    return true;
  }

  return PREAMBLE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Removes thinking tags, chain-of-thought blocks, and meta-reasoning preambles from text.
 */
export function stripModelThinking(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Strip closed thinking tags (<think>...</think>, <thought>...</thought>, etc.)
  cleaned = cleaned.replace(CLOSED_THINKING_REGEX, "");

  // 2. Handle unclosed thinking tags if present
  if (/<(?:think|thought|reasoning|cot)>/i.test(cleaned)) {
    if (UNCLOSED_THINKING_START_REGEX.test(cleaned)) {
      cleaned = cleaned.replace(UNCLOSED_THINKING_START_REGEX, "");
    } else {
      // Fallback: check if there's a JSON array or object or bullets later in text
      const contentIndex = cleaned.search(/(?:\[\s*\{|\{\s*"|\n[-*•–—●○■▪✦★◦▸]\s+)/);
      if (contentIndex !== -1) {
        cleaned = cleaned.slice(contentIndex);
      } else {
        cleaned = cleaned.replace(UNCLOSED_THINKING_REST_REGEX, "");
      }
    }
  }

  // 3. Remove standalone closing tags if any remain
  cleaned = cleaned.replace(/<\/(?:think|thought|reasoning|cot)>/gi, "");

  // 4. Strip line-by-line preamble headers from the beginning of the text
  const lines = cleaned.split(/\r?\n/);
  let firstValidIndex = 0;

  while (firstValidIndex < lines.length) {
    const line = lines[firstValidIndex];
    if (!line.trim() || isThinkingOrPreamble(line)) {
      firstValidIndex++;
    } else {
      break;
    }
  }

  if (firstValidIndex > 0) {
    lines.splice(0, firstValidIndex);
    cleaned = lines.join("\n");
  }

  // 5. Also check if the line itself begins with an inline preamble like "*Analyze User Input:** Real bullet"
  cleaned = cleaned
    .replace(/^(\*{1,2}|#{1,4})?\s*Analyze (?:User )?Input:?\*{0,2}\s*/i, "")
    .replace(/^Here'?s a thinking process:?\s*/i, "")
    .replace(/^Thinking Process:?\s*/i, "");

  return cleaned.trim();
}
