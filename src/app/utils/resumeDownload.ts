/**
 * Resume download utilities: PDF and Markdown only.
 * PDF is generated with @react-pdf/renderer (native PDF, 40pt margins, professional typography).
 */

import React from "react";
import { markdownToResumeBlocks } from "./resumePdfStructure";
import ResumePdfDocument from "@/app/components/ResumePdfDocument";

/**
 * Download resume as PDF using @react-pdf/renderer. Produces a native PDF with
 * selectable text and professional typography. Optional templateId selects layout variant.
 */
export async function downloadResumeAsPdf(
  markdownContent: string,
  filename: string = "resume.pdf",
  templateId?: string
): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("downloadResumeAsPdf is only available in the browser");
  }

  const { pdf } = await import("@react-pdf/renderer");
  const blocks = markdownToResumeBlocks(markdownContent);
  const doc = React.createElement(ResumePdfDocument, {
    blocks,
    templateId: templateId ?? "modern-hybrid",
  });
  // ResumePdfDocument renders <Document>; pdf() expects ReactElement<DocumentProps>.
  // Type assertion: wrapper component renders a valid Document tree; @react-pdf types are strict.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "") + ".pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadResumeAsMarkdown(
  markdownContent: string,
  filename: string = "resume.md"
): void {
  const safeName = filename.replace(/\.md$/i, "") + ".md";
  const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function resumeDownloadFilename(title: string): string {
  return title
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .slice(0, 60) || "resume";
}

/**
 * PDF filename with template id and download timestamp, e.g. full-stack_developer_modern-hybrid_2025-02-26T14-30-22.pdf
 */
export function resumeDownloadFilenamePdf(baseName: string, templateId: string): string {
  const safe = (s: string) =>
    s
      .replace(/[^a-z0-9-_]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${baseName}_${safe(templateId)}_${ts}.pdf`;
}
