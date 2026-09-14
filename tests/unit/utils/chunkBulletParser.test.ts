import { describe, it, expect } from "vitest";
import { parseChunkBulletsResponse } from "@/app/utils/chunkBulletParser";

describe("chunkBulletParser - Substantive Change Filtering", () => {
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
});
