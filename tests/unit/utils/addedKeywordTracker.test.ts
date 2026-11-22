import { describe, it, expect } from "vitest";
import {
  extractAddedMissingKeywords,
  resolveSuggestionAddedKeywords,
} from "@/app/utils/addedKeywordTracker";
import { sanitizeSuggestionsForLocked } from "@/app/utils/gatingSanitizer";

describe("addedKeywordTracker", () => {
  it("detects missing JD keywords added to a suggestion that were absent from original resume", () => {
    const originalResume =
      "Backend Software Engineer using Node.js, TypeScript, and PostgreSQL on SaaS logistics platforms.";
    const origBullet =
      "Maintained 99.4% service availability across REST endpoints while mentoring 3 junior developers.";
    const tailoredBullet =
      "Maintained 99.4% service availability supporting CI/CD deployment gates and HIPAA and PCI compliance practices.";

    const added = extractAddedMissingKeywords(originalResume, origBullet, tailoredBullet, [
      "PostgreSQL", // already in resume -> NOT new
      "CI/CD",
      "HIPAA",
      "PCI",
      "Go", // substring inside things must not false-match
    ]);

    expect(added).toEqual(["CI/CD", "HIPAA", "PCI"]);
  });

  it("prefers server-computed addedMissingKeywords even when suggestedText is masked with lock placeholder", () => {
    const locked = sanitizeSuggestionsForLocked(
      [
        {
          id: "sug-1",
          section: "Experience",
          originalText: "Managed logistics APIs.",
          suggestedText: "Managed HIPAA compliant APIs.",
          reason: "Added compliance keyword",
          keywords: ["HIPAA"],
          addedMissingKeywords: ["HIPAA"],
        },
      ],
      null
    );

    const resolved = resolveSuggestionAddedKeywords(locked[0], "Managed logistics APIs.");
    expect(resolved).toEqual(["HIPAA"]);
  });
});
