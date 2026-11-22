import { describe, it, expect } from "vitest";
import { parseChunkBulletsResponse } from "@/app/utils/chunkBulletParser";

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
