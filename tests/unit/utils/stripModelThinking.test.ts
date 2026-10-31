import { describe, it, expect } from "vitest";
import { stripModelThinking, isThinkingOrPreamble } from "@/app/utils/stripModelThinking";

describe("stripModelThinking", () => {
  it("strips closed <think>...</think> blocks cleanly", () => {
    const input = `<think>
Here's a thinking process:
1. Analyze User Input:
- The user wants to improve this bullet.
</think>
[
  {
    "index": 0,
    "suggestedText": "Architected distributed streaming pipelines"
  }
]`;
    const result = stripModelThinking(input);
    expect(result).not.toContain("<think>");
    expect(result).not.toContain("Here's a thinking process");
    expect(result).toContain('"suggestedText": "Architected distributed streaming pipelines"');
  });

  it("strips <thought> and <reasoning> tags", () => {
    const input = `<thought>Internal model thought trace</thought>
<reasoning>Step by step analysis</reasoning>
- Accelerated API response times by 40%`;
    const result = stripModelThinking(input);
    expect(result).toBe("- Accelerated API response times by 40%");
  });

  it("handles unclosed <think> before JSON or bullets", () => {
    const input = `<think>
Here's a thinking process:
*Analyze User Input:**
Candidate has 10 years experience.

[
  {
    "index": 0,
    "suggestedText": "Designed scalable PostgreSQL schemas"
  }
]`;
    const result = stripModelThinking(input);
    expect(result).not.toContain("<think>");
    expect(result).not.toContain("Analyze User Input");
    expect(result).toContain('"suggestedText": "Designed scalable PostgreSQL schemas"');
  });

  it("strips standalone preamble lines (*Analyze User Input:**, Here's a thinking process:)", () => {
    const input = `Here's a thinking process:
*Analyze User Input:**
- Refactored legacy monolithic services into modular Go microservices.
- Deployed Kubernetes clusters across multiple AWS availability zones.`;

    const result = stripModelThinking(input);
    expect(result).not.toContain("thinking process");
    expect(result).not.toContain("Analyze User Input");
    expect(result).toContain("- Refactored legacy monolithic services");
  });

  it("strips inline preambles attached to bullet text", () => {
    const input = "*Analyze User Input:** Orchestrated migration to AWS EKS with zero downtime.";
    const result = stripModelThinking(input);
    expect(result).toBe("Orchestrated migration to AWS EKS with zero downtime.");
  });

  it("correctly identifies thinking and preamble lines via isThinkingOrPreamble", () => {
    expect(isThinkingOrPreamble("<think>")).toBe(true);
    expect(isThinkingOrPreamble("</think>")).toBe(true);
    expect(isThinkingOrPreamble("Here's a thinking process:")).toBe(true);
    expect(isThinkingOrPreamble("*Analyze User Input:**")).toBe(true);
    expect(isThinkingOrPreamble("**Analyze User Input:**")).toBe(true);
    expect(isThinkingOrPreamble("### Analyze User Input")).toBe(true);
    expect(isThinkingOrPreamble("**Step 1: Understand context**")).toBe(true);
    expect(isThinkingOrPreamble("Here are the tailored bullets:")).toBe(true);

    // Legitimate resume content must NOT be flagged as preamble
    expect(isThinkingOrPreamble("- Architected enterprise React frontends")).toBe(false);
    expect(isThinkingOrPreamble("Analyzed complex data sets to drive revenue")).toBe(false);
    expect(isThinkingOrPreamble("11+ Years of Engineering Leadership")).toBe(false);
  });
});
