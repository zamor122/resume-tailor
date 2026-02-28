"use client";

import { useMemo } from "react";
import DiffMatchPatch from "diff-match-patch";

interface ResumeDiffViewProps {
  originalText: string;
  tailoredText: string;
  className?: string;
}

/**
 * Renders a line-by-line diff of original vs tailored resume.
 * Additions are highlighted in green, removals in red (or strikethrough).
 */
export default function ResumeDiffView({
  originalText,
  tailoredText,
  className = "",
}: ResumeDiffViewProps) {
  const diffHtml = useMemo(() => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(originalText, tailoredText);
    dmp.diff_cleanupSemantic(diffs);
    return dmp.diff_prettyHtml(diffs);
  }, [originalText, tailoredText]);

  return (
    <div
      className={`resume-diff overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm font-mono whitespace-pre-wrap break-words [&_ins]:bg-emerald-200 dark:[&_ins]:bg-emerald-900/40 [&_ins]:no-underline [&_del]:bg-red-200 dark:[&_del]:bg-red-900/40 [&_del]:line-through ${className}`}
      dangerouslySetInnerHTML={{ __html: diffHtml }}
    />
  );
}
