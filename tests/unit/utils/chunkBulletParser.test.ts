import { describe, it, expect } from "vitest";
import { parseChunkBulletsResponse } from "@/app/utils/chunkBulletParser";

describe("chunkBulletParser - Substantive Change Filtering & Sanitization", () => {
  it("drops suggestions that only differ by newlines or punctuation in structured JSON pass", () => {
    const origBullets = [
      "- Built React frontends for 100k users.",
      "- Managed Postgres database systems.",
    ];

    const llmJson = JSON.stringify([
      {
        index: 0,
        suggestedText: "Architected enterprise React frontends for 100k users.",
        reason: "Active leadership verbs",
      },
      {
        index: 1,
        // Only a newline and period change
        suggestedText: "Managed Postgres\ndatabase systems",
        reason: "Trivial tweak",
      },
    ]);

    const result = parseChunkBulletsResponse({
      llmText: llmJson,
      origBullets,
      sectionGroupId: "exp-acme",
      sectionGroupTitle: "Acme Corp - Software Engineer",
    });

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].suggestedText).toBe(
      "Architected enterprise React frontends for 100k users."
    );
    // Non-substantive bullet preserves clean original text
    expect(result.tailoredBullets[1]).toBe("- Managed Postgres database systems.");
  });

  it("drops suggestions that only differ by newlines or formatting in fallback pass", () => {
    const origBullets = [
      "- Built React frontends.",
      "- Managed Postgres database.",
    ];

    const llmText = `- Architected enterprise React frontends with 99.9% uptime.
- Managed Postgres\ndatabase.`;

    const result = parseChunkBulletsResponse({
      llmText,
      origBullets,
      sectionGroupId: "exp-acme",
      sectionGroupTitle: "Acme Corp - Software Engineer",
    });

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].suggestedText).toContain("Architected enterprise React");
    expect(result.tailoredBullets[1]).toBe("- Managed Postgres database.");
  });

  it("strips <think> tags and reasoning blocks from JSON responses", () => {
    const origBullets = [
      "- Built microservices in Go.",
      "- Managed Redis caches.",
    ];

    const llmText = `<think>
Here's a thinking process:
*Analyze User Input:**
The candidate wrote microservices in Go. I will quantify the impact.
</think>
[
  {
    "index": 0,
    "suggestedText": "Architected high-throughput Go microservices processing 40k RPS.",
    "reason": "Quantified RPS"
  },
  {
    "index": 1,
    "suggestedText": "Managed distributed Redis caching clusters reducing DB load by 35%.",
    "reason": "Quantified DB load reduction"
  }
]`;

    const result = parseChunkBulletsResponse({
      llmText,
      origBullets,
      sectionGroupId: "exp-acme",
      sectionGroupTitle: "Acme Corp - Software Engineer",
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].suggestedText).not.toContain("<think>");
    expect(result.suggestions[0].suggestedText).not.toContain("thinking process");
    expect(result.suggestions[0].suggestedText).toBe("Architected high-throughput Go microservices processing 40k RPS.");
    expect(result.suggestions[1].suggestedText).toBe("Managed distributed Redis caching clusters reducing DB load by 35%.");
  });

  it("safeguards fallback pass: discards <think> traces and *Analyze User Input:** preamble headers", () => {
    const origBullets = [
      "- Built microservices in Go.",
      "- Managed Redis caches.",
    ];

    // Model outputs thinking and preamble before real bullets in fallback mode
    const llmText = `<think> Here's a thinking process:
*Analyze User Input:**
Candidate has backend experience.
</think>
- Scaled high-throughput Go microservices processing 50k RPS.
- Deployed distributed Redis caching clusters with 99.99% availability.`;

    const result = parseChunkBulletsResponse({
      llmText,
      origBullets,
      sectionGroupId: "exp-acme",
      sectionGroupTitle: "Acme Corp - Software Engineer",
    });

    expect(result.suggestions).toHaveLength(2);
    // Must NOT treat thinking or preamble lines as suggestions
    expect(result.suggestions[0].suggestedText).not.toContain("<think>");
    expect(result.suggestions[0].suggestedText).not.toContain("Analyze User Input");
    expect(result.suggestions[0].suggestedText).toBe("Scaled high-throughput Go microservices processing 50k RPS.");
    expect(result.suggestions[1].suggestedText).toBe("Deployed distributed Redis caching clusters with 99.99% availability.");
  });

  it("diversifies duplicate opening verbs across bullets in the same job chunk", () => {
    const origBullets = [
      "- Built microservices in Go.",
      "- Built GraphQL schema.",
      "- Built CI/CD pipelines.",
    ];

    const llmJson = JSON.stringify([
      {
        index: 0,
        suggestedText: "Architected scalable Go microservices serving 10M requests daily.",
      },
      {
        index: 1,
        // Repeated opening verb "Architected"
        suggestedText: "Architected enterprise GraphQL schema reducing frontend network roundtrips by 40%.",
      },
      {
        index: 2,
        // Repeated opening verb "Architected" again
        suggestedText: "Architected automated CI/CD pipelines accelerating releases from bi-weekly to daily.",
      },
    ]);

    const result = parseChunkBulletsResponse({
      llmText: llmJson,
      origBullets,
      sectionGroupId: "exp-acme",
      sectionGroupTitle: "Acme Corp - Software Engineer",
    });

    expect(result.suggestions).toHaveLength(3);
    const verb0 = result.suggestions[0].suggestedText.split(" ")[0];
    const verb1 = result.suggestions[1].suggestedText.split(" ")[0];
    const verb2 = result.suggestions[2].suggestedText.split(" ")[0];

    // All three opening verbs must be distinct!
    expect(verb0).toBe("Architected");
    expect(verb1).not.toBe("Architected");
    expect(verb2).not.toBe("Architected");
    expect(verb1).not.toBe(verb2);
  });
});

describe("chunkBulletParser JSON safety", () => {
  it("salvages valid bullet objects from truncated/malformed JSON array instead of falling back to raw JSON", () => {
    const malformed = `[{"index":0,"originalText":"Process financial transactions","suggestedText":"Processed 50+ daily financial transactions including wire transfers and deposits accurately.","reason":"Active verb","keywords":["financial transactions"]},"trailing garbage`;
    const { suggestions, tailoredBullets } = parseChunkBulletsResponse({
      llmText: malformed,
      origBullets: ["- Process financial transactions"],
      sectionGroupId: "section-exp-0",
      sectionGroupTitle: "PNC – Bank Teller",
      jobIndex: 0,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedText).toContain("Processed 50+ daily financial transactions");
    expect(tailoredBullets[0]).not.toContain('[{"index"');
  });

  it("never leaks raw JSON lines into resume bullets when no objects can be parsed", () => {
    const broken = `[{"index":0,"originalText":"Process financial transactions","suggestedText":"unclosed string`;
    const { suggestions, tailoredBullets } = parseChunkBulletsResponse({
      llmText: broken,
      origBullets: ["- Process financial transactions"],
      sectionGroupId: "section-exp-0",
      sectionGroupTitle: "PNC – Bank Teller",
      jobIndex: 0,
    });

    expect(suggestions).toHaveLength(0);
    expect(tailoredBullets[0]).toBe("- Process financial transactions");
  });
});
