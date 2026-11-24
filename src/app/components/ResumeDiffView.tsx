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
    const safeOriginal = typeof originalText === "string" ? originalText : "";
    const safeTailored = typeof tailoredText === "string" ? tailoredText : "";
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(safeOriginal, safeTailored);
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
      className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl px-4 py-3 flex flex-nowrap items-center gap-x-5 text-xs font-mono text-[#1C2028] overflow-x-auto"
      role="figure"
      aria-label="Legend for changes"
    >
      <span className="neo-tag bg-[#1C2028] text-white text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider shrink-0 border border-[#1C2028]">
        DIFF LEGEND
      </span>
      <span className="inline-flex items-center gap-1.5 shrink-0 font-bold">
        <span className="w-3 h-3 rounded-sm bg-[#10B981] border border-[#1C2028]" aria-hidden />
        <span className="whitespace-nowrap">Green = Added in tailored resume</span>
      </span>
      <span className="inline-flex items-center gap-1.5 shrink-0 font-bold text-gray-600">
        <span className="w-3 h-3 rounded-sm bg-[#EF4444] border border-[#1C2028]" aria-hidden />
        <span className="line-through whitespace-nowrap">Red = Removed from original</span>
      </span>
    </div>
  );

  const paneClass =
    "resume-diff overflow-auto rounded-xl border-2 border-[#1C2028] bg-white p-5 text-xs sm:text-sm font-mono whitespace-pre-wrap break-words text-[#1C2028] shadow-[3px_3px_0px_#1C2028] leading-relaxed [&_ins]:bg-[#D1FAE5] [&_ins]:text-[#065F46] [&_ins]:font-bold [&_ins]:no-underline [&_del]:bg-[#FEE2E2] [&_del]:text-[#991B1B] [&_del]:line-through";

  if (layout === "side-by-side") {
    return (
      <div className={`space-y-4 ${className}`}>
        {legend}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="neo-tag bg-[#1C2028] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1C2028] shadow-[1px_1px_0px_#1C2028]">
                01 ORIGINAL
              </span>
              <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wide">
                Previous Version
              </span>
            </div>
            <div
              className={paneClass}
              dangerouslySetInnerHTML={{ __html: leftHtml }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="neo-tag bg-[#10B981] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1C2028] shadow-[1px_1px_0px_#1C2028]">
                02 TAILORED
              </span>
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wide">
                Current Version
              </span>
            </div>
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
    <div className={`space-y-4 ${className}`}>
      {legend}
      <div className={paneClass} dangerouslySetInnerHTML={{ __html: unifiedHtml }} />
    </div>
  );
}
