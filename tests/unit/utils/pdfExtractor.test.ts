import { describe, it, expect } from "vitest";
import { reconstructPdfPageLines } from "@/app/utils/pdfExtractor";

describe("pdfExtractor - reconstructPdfPageLines", () => {
  it("preserves line breaks, paragraph gaps, and bullet lines across Y-baseline shifts and hasEOL", () => {
    const items = [
      { str: "JORDAN M. TAYLOR", transform: [1, 0, 0, 1, 50, 750], hasEOL: true },
      { str: "PROFESSIONAL SUMMARY", transform: [1, 0, 0, 1, 50, 720], hasEOL: true },
      { str: "Dedicated customer service", transform: [1, 0, 0, 1, 50, 704], hasEOL: false },
      { str: "professional with 4+ years.", transform: [1, 0, 0, 1, 180, 704], hasEOL: true },
      { str: "PROFESSIONAL EXPERIENCE", transform: [1, 0, 0, 1, 50, 670], hasEOL: true },
      { str: "Senior Customer Support Associate", transform: [1, 0, 0, 1, 50, 654], hasEOL: false },
      { str: "— Apex Retail Solutions", transform: [1, 0, 0, 1, 220, 654], hasEOL: true },
      { str: "• Handled top 10% of escalated inquiries.", transform: [1, 0, 0, 1, 60, 638], hasEOL: true },
      { str: "• Maintained 94% CSAT retention rate.", transform: [1, 0, 0, 1, 60, 624], hasEOL: true },
    ];

    const text = reconstructPdfPageLines(items);
    const lines = text.split("\n").filter(Boolean);

    expect(lines.length).toBeGreaterThanOrEqual(7);
    expect(text).toContain("JORDAN M. TAYLOR\n\nPROFESSIONAL SUMMARY\nDedicated customer service professional with 4+ years.");
    expect(text).toContain("• Handled top 10% of escalated inquiries.\n• Maintained 94% CSAT retention rate.");
  });
});
