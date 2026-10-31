"use client";

import { useMemo } from "react";
import DiffMatchPatch from "diff-match-patch";

export type DiffLayout = "unified" | "side-by-side";

interface ResumeDiffViewProps {
  originalText: string;
  tailoredText: string;
  className?: string;
  /** Label for added text, shown in legend and on hover (e.g. "Added in this version") */
  addedLabel?: string;
  /** Label for removed text, shown in legend and on hover (e.g. "Removed from previous version") */
  removedLabel?: string;
  /** "unified" (default) renders one inline column; "side-by-side" renders two panes. */
  layout?: DiffLayout;
}

const DEFAULT_ADDED_LABEL = "Added in this version";
const DEFAULT_REMOVED_LABEL = "Removed from previous version";

/** HTML-escape text before injecting into dangerouslySetInnerHTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Renders a line-by-line diff of original vs tailored resume.
 * GitHub Desktop style: muted transparent green = added, muted transparent red = removed.
 * Text inherits body color for readability.
 *
 * `layout="side-by-side"` splits the diff into two aligned panes (original on the
 * left with removals struck through, tailored on the right with additions
 * highlighted) — the classic before/after comparison.
 */
export default function ResumeDiffView({
  originalText,
  tailoredText,
  className = "",
  addedLabel = DEFAULT_ADDED_LABEL,
  removedLabel = DEFAULT_REMOVED_LABEL,
  layout = "unified",
}: ResumeDiffViewProps) {
  const { unifiedHtml, leftHtml, rightHtml } = useMemo(() => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(originalText, tailoredText);
    dmp.diff_cleanupSemantic(diffs);

    const safeAdded = addedLabel.replace(/"/g, "&quot;");
    const safeRemoved = removedLabel.replace(/"/g, "&quot;");

    // Unified: reuse diff-match-patch's renderer, stripping its inline styles so
    // our GitHub-style muted backgrounds apply.
    const unified = dmp
      .diff_prettyHtml(diffs)
      .replace(/<ins\s+style="[^"]*">/g, `<ins title="${safeAdded}">`)
      .replace(/<del\s+style="[^"]*">/g, `<del title="${safeRemoved}">`);

    // Side-by-side: walk the same diff and fan equal/removed text to the left
    // pane and equal/added text to the right pane.
    let left = "";
    let right = "";
    for (const [op, text] of diffs) {
      if (op === 0) {
        left += escapeHtml(text);
        right += escapeHtml(text);
      } else if (op === -1) {
        left += `<del title="${safeRemoved}">${escapeHtml(text)}</del>`;
      } else {
        right += `<ins title="${safeAdded}">${escapeHtml(text)}</ins>`;
      }
    }

    return { unifiedHtml: unified, leftHtml: left, rightHtml: right };
  }, [originalText, tailoredText, addedLabel, removedLabel]);

  const legend = (
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
  );

  const paneClass =
    "resume-diff overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 text-sm font-mono whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 [&_ins]:no-underline [&_del]:line-through";

  if (layout === "side-by-side") {
    return (
      <div className={`space-y-3 ${className}`}>
        {legend}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Original
            </p>
            <div
              className={paneClass}
              dangerouslySetInnerHTML={{ __html: leftHtml }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tailored
            </p>
            <div
              className={paneClass}
              dangerouslySetInnerHTML={{ __html: rightHtml }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {legend}
      <div className={paneClass} dangerouslySetInnerHTML={{ __html: unifiedHtml }} />
    </div>
  );
}
