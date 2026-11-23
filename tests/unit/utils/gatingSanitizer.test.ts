import { describe, it, expect } from "vitest";
import {
  sanitizeSuggestionsForLocked,
  sanitizeSectionGroupsForLocked,
  sanitizeContentMapForLocked,
  containsLockedPlaceholder,
  selectSafePrefillResume,
  LOCKED_SUGGESTION_PLACEHOLDER,
} from "@/app/utils/gatingSanitizer";
import type { ResumeSuggestion, ResumeSectionGroup } from "@/app/agent/state";
import type { ContentMapEntry } from "@/app/utils/resumeObfuscator";

describe("gatingSanitizer anti-fraud utility", () => {
  describe("sanitizeSuggestionsForLocked", () => {
    const mockSuggestions: ResumeSuggestion[] = [
      {
        id: "sug-1",
        section: "Experience",
        originalText: "Managed team of developers.",
        suggestedText: "Spearheaded cross-functional team of 12 engineers, accelerating sprint velocity by 34%.",
        reason: "Adds quantification and strong leadership action verb",
        keywords: ["cross-functional", "velocity"],
      },
      {
        id: "sug-2",
        section: "Experience",
        originalText: "Optimized database queries.",
        suggestedText: "Redesigned PostgreSQL indexing architecture, cutting p99 latency from 450ms to 65ms.",
        reason: "Specific technical depth and latency metric",
        keywords: ["PostgreSQL", "indexing", "latency"],
      },
    ];

    it("masks all suggestions when freeReveal is null", () => {
      const sanitized = sanitizeSuggestionsForLocked(mockSuggestions, null);
      expect(sanitized).toHaveLength(2);
      expect(sanitized[0].suggestedText).toBe(LOCKED_SUGGESTION_PLACEHOLDER);
      expect((sanitized[0] as any).isLocked).toBe(true);
      expect((sanitized[0] as any).isFreeReveal).toBe(false);

      expect(sanitized[1].suggestedText).toBe(LOCKED_SUGGESTION_PLACEHOLDER);
      expect((sanitized[1] as any).isLocked).toBe(true);
      expect((sanitized[1] as any).isFreeReveal).toBe(false);
    });

    it("preserves only the single matching freeReveal suggestion while masking the rest", () => {
      const freeReveal = {
        improvedText: "Redesigned PostgreSQL indexing architecture, cutting p99 latency from 450ms to 65ms.",
      };

      const sanitized = sanitizeSuggestionsForLocked(mockSuggestions, freeReveal);
      expect(sanitized).toHaveLength(2);

      // First suggestion is locked
      expect(sanitized[0].suggestedText).toBe(LOCKED_SUGGESTION_PLACEHOLDER);
      expect((sanitized[0] as any).isLocked).toBe(true);
      expect((sanitized[0] as any).isFreeReveal).toBe(false);

      // Second suggestion is free reveal
      expect(sanitized[1].suggestedText).toBe(
        "Redesigned PostgreSQL indexing architecture, cutting p99 latency from 450ms to 65ms."
      );
      expect((sanitized[1] as any).isLocked).toBe(false);
      expect((sanitized[1] as any).isFreeReveal).toBe(true);
    });

    it("handles null or undefined suggestions gracefully", () => {
      expect(sanitizeSuggestionsForLocked(null, null)).toEqual([]);
      expect(sanitizeSuggestionsForLocked(undefined, null)).toEqual([]);
    });
  });

  describe("sanitizeSectionGroupsForLocked", () => {
    it("strips raw tailoredContent and replaces suggestions with sanitized versions", () => {
      const mockGroups: ResumeSectionGroup[] = [
        {
          id: "sec-1",
          sectionType: "experience",
          title: "Google",
          orderIndex: 0,
          status: "ready",
          auditRationale: "High impact backend engineering",
          originalContent: "Original content",
          tailoredContent: "CONFIDENTIAL LEAKED CONTENT THAT MUST NOT BE RETURNED",
          hasChanges: true,
          suggestions: [
            {
              id: "sug-1",
              section: "Google",
              originalText: "Built API",
              suggestedText: "Built resilient GraphQL gateway",
              reason: "Improves tech stack",
              keywords: ["GraphQL"],
            },
          ],
        },
      ];

      const sanitizedSuggestions = [
        {
          id: "sug-1",
          section: "Google",
          originalText: "Built API",
          suggestedText: LOCKED_SUGGESTION_PLACEHOLDER,
          reason: "Improves tech stack",
          keywords: ["GraphQL"],
          isLocked: true,
          isFreeReveal: false,
        } as any,
      ];

      const sanitizedGroups = sanitizeSectionGroupsForLocked(mockGroups, sanitizedSuggestions);
      expect(sanitizedGroups).toBeDefined();
      expect(sanitizedGroups![0].tailoredContent).toBeUndefined();
      expect(sanitizedGroups![0].auditRationale).toBe("High impact backend engineering");
      expect(sanitizedGroups![0].suggestions[0].suggestedText).toBe(LOCKED_SUGGESTION_PLACEHOLDER);
    });

    it("handles null or undefined section groups", () => {
      expect(sanitizeSectionGroupsForLocked(null, [])).toBeUndefined();
      expect(sanitizeSectionGroupsForLocked(undefined, [])).toBeUndefined();
    });
  });

  describe("sanitizeContentMapForLocked", () => {
    it("strips realText from non-free reveal entries while keeping free reveal intact", () => {
      const contentMap: ContentMapEntry[] = [
        {
          obfuscatedText: "████████████",
          realText: "Proprietary accomplishment bullet",
          position: { start: 10, end: 50 },
          section: "Experience",
          isFreeReveal: false,
        },
        {
          obfuscatedText: "Revealed bullet",
          realText: "Free teaser bullet point",
          position: { start: 60, end: 90 },
          section: "Experience",
          isFreeReveal: true,
        },
      ];

      const sanitized = sanitizeContentMapForLocked(contentMap);
      expect(sanitized).toHaveLength(2);

      // Locked entry must NOT have realText
      expect((sanitized[0] as any).realText).toBeUndefined();
      expect(sanitized[0].obfuscatedText).toBe("████████████");

      // Free reveal entry keeps realText
      expect(sanitized[1].realText).toBe("Free teaser bullet point");
    });

    it("handles null or undefined contentMap", () => {
      expect(sanitizeContentMapForLocked(null)).toEqual([]);
      expect(sanitizeContentMapForLocked(undefined)).toEqual([]);
    });
  });

  describe("containsLockedPlaceholder & selectSafePrefillResume", () => {
    it("detects both obfuscation and suggestion lock placeholders", () => {
      expect(containsLockedPlaceholder("🔒 AI-optimized content locked — unlock to reveal Q0&#123")).toBe(true);
      expect(containsLockedPlaceholder(LOCKED_SUGGESTION_PLACEHOLDER)).toBe(true);
      expect(containsLockedPlaceholder("Built event-driven TypeScript services.")).toBe(false);
      expect(containsLockedPlaceholder(null)).toBe(false);
    });

    it("never prefills the editor with obfuscated text when re-tailoring a locked version", () => {
      const safe = selectSafePrefillResume({
        prefillVersion: "cb4c25ce",
        isUnlocked: false,
        originalResume: "Original uploaded resume content",
        tailoredResume: "Original start 🔒 AI-optimized content locked — unlock to reveal AbCdEf12",
      });
      expect(safe).toBe("Original uploaded resume content");
    });

    it("falls back to originalResume if tailoredResume has lock placeholders even when isUnlocked is true", () => {
      const safe = selectSafePrefillResume({
        prefillVersion: "b5a66c59",
        isUnlocked: true,
        originalResume: "Clean original uploaded resume content",
        tailoredResume: "Tailored prefix 🔒 AI-optimized content locked — unlock to reveal AbCdEf12",
      });
      expect(safe).toBe("Clean original uploaded resume content");
    });

    it("uses tailoredResume when prefillVersion is set, unlocked is true, and text is clean", () => {
      const safe = selectSafePrefillResume({
        prefillVersion: "v2",
        isUnlocked: true,
        originalResume: "Original uploaded resume content",
        tailoredResume: "Tailored clean resume content",
      });
      expect(safe).toBe("Tailored clean resume content");
    });
  });
});
