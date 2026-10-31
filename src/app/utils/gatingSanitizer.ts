import type { ResumeSuggestion, ResumeSectionGroup } from "@/app/agent/state";
import type { ContentMapEntry } from "@/app/utils/resumeObfuscator";

export interface FreeRevealTarget {
  originalText?: string;
  improvedText?: string;
}

export const LOCKED_SUGGESTION_PLACEHOLDER =
  "🔒 AI-tailored accomplishment locked. Upgrade to unlock full metrics and bullet improvements.";

/**
 * Sanitizes suggestions for locked/unpaid view:
 * Keeps the single freeReveal suggestion in full (if any), but replaces all other
 * suggestedText fields with a locked placeholder so that client inspection cannot
 * extract tailored bullets without paying.
 */
export function sanitizeSuggestionsForLocked(
  suggestions: ResumeSuggestion[] | null | undefined,
  freeReveal: FreeRevealTarget | null | undefined
): ResumeSuggestion[] {
  if (!Array.isArray(suggestions)) return [];

  return suggestions.map((sug) => {
    const isFree = Boolean(
      freeReveal &&
        ((freeReveal.improvedText &&
          sug.suggestedText &&
          sug.suggestedText.trim() === freeReveal.improvedText.trim()) ||
          (freeReveal.originalText &&
            sug.originalText &&
            sug.originalText.trim() === freeReveal.originalText.trim()))
    );

    if (isFree) {
      return {
        ...sug,
        category: sug.category,
        isFreeReveal: true,
        isLocked: false,
      } as ResumeSuggestion & { isFreeReveal: boolean; isLocked: boolean };
    }

    return {
      ...sug,
      suggestedText: LOCKED_SUGGESTION_PLACEHOLDER,
      isFreeReveal: false,
      isLocked: true,
    } as ResumeSuggestion & { isFreeReveal: boolean; isLocked: boolean };
  });
}

/**
 * Sanitizes section groups for locked/unpaid view:
 * Strips raw tailoredContent and maps suggestions through the sanitized suggestions array.
 */
export function sanitizeSectionGroupsForLocked(
  sectionGroups: ResumeSectionGroup[] | null | undefined,
  sanitizedSuggestions: ResumeSuggestion[]
): ResumeSectionGroup[] | undefined {
  if (!Array.isArray(sectionGroups)) return undefined;

  return sectionGroups.map((group) => {
    const groupSuggestions = (group.suggestions || []).map((s) => {
      const matchingSanitized = sanitizedSuggestions.find((san) => san.id === s.id);
      return (
        matchingSanitized || {
          ...s,
          suggestedText: LOCKED_SUGGESTION_PLACEHOLDER,
          isLocked: true,
        }
      );
    });

    return {
      ...group,
      tailoredContent: undefined, // Strip raw tailored section text to prevent leak
      suggestions: groupSuggestions,
    };
  });
}

/**
 * Sanitizes contentMap to ensure realText is never leaked to unpaid clients
 */
export function sanitizeContentMapForLocked(
  contentMap: ContentMapEntry[] | null | undefined
): Array<Omit<ContentMapEntry, "realText"> & { realText?: string }> {
  if (!Array.isArray(contentMap)) return [];

  return contentMap.map((entry) => {
    if (entry.isFreeReveal) {
      return entry;
    }
    // Completely strip realText for non-free reveal entries
    const { realText: _stripped, ...safeEntry } = entry;
    return safeEntry;
  });
}
