"use client";

import { useMemo } from "react";
import DiffMatchPatch from "diff-match-patch";

interface ResumeDiffViewProps {
  originalText: string;
  tailoredText: string;
  className?: string;
  /** Label for added text, shown in legend and on hover (e.g. "Added in this version") */
  addedLabel?: string;
  /** Label for removed text, shown in legend and on hover (e.g. "Removed from previous version") */
  removedLabel?: string;
}

const DEFAULT_ADDED_LABEL = "Added in this version";
const DEFAULT_REMOVED_LABEL = "Removed from previous version";

/**
 * Renders a line-by-line diff of original vs tailored resume.
 * GitHub Desktop style: muted transparent green = added, muted transparent red = removed.
 * Text inherits body color for readability.
 */
export default function ResumeDiffView({
  originalText,
  tailoredText,
  className = "",
  addedLabel = DEFAULT_ADDED_LABEL,
  removedLabel = DEFAULT_REMOVED_LABEL,
}: ResumeDiffViewProps) {
  const diffHtml = useMemo(() => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(originalText, tailoredText);
    dmp.diff_cleanupSemantic(diffs);
    const raw = dmp.diff_prettyHtml(diffs);
    const safeAdded = addedLabel.replace(/"/g, "&quot;");
    const safeRemoved = removedLabel.replace(/"/g, "&quot;");
    // Strip diff-match-patch inline styles so our GitHub-style muted backgrounds apply
    return raw
      .replace(/<ins\s+style="[^"]*">/g, `<ins title="${safeAdded}">`)
      .replace(/<del\s+style="[^"]*">/g, `<del title="${safeRemoved}">`);
  }, [originalText, tailoredText, addedLabel, removedLabel]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="flex flex-nowrap items-center gap-x-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 overflow-x-auto"
        role="figure"
        aria-label="Legend for changes"
      >
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span className="resume-diff-legend-add inline-block h-4 min-w-3 rounded-sm" aria-hidden />
          <span className="whitespace-nowrap">Green highlight = added</span>
        </span>
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span className="resume-diff-legend-del inline-block h-4 min-w-3 rounded-sm line-through decoration-gray-500" aria-hidden />
          <span className="line-through whitespace-nowrap">Red highlight = removed</span>
        </span>
      </div>
      <div
        className="resume-diff overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 text-sm font-mono whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 [&_ins]:no-underline [&_del]:line-through"
        dangerouslySetInnerHTML={{ __html: diffHtml }}
      />
    </div>
  );
}
