/**
 * PDF Text Extraction Utility
 * Uses Mozilla's pdfjs-dist (the same library used by Firefox)
 * This is the most established and well-maintained PDF parsing library
 */

// Dynamic import for client-side only (pdfjs-dist doesn't work in Edge runtime)
let pdfjsLib: any = null;

async function getPdfjsLib() {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction only works in the browser');
  }
  
  if (!pdfjsLib) {
    // Use webpack build - bundles the correct worker from the same package (avoids version mismatch)
    pdfjsLib = await import('pdfjs-dist/webpack.mjs');
  }
  
  return pdfjsLib;
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

export interface PDFTextItem {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
}

/**
 * Reconstructs real lines and paragraph breaks from pdfjs-dist TextContent items
 * using vertical Y-baseline deltas and `hasEOL` flags so bullet points, section
 * headers, and job dates are preserved instead of flattened into one line.
 */
export function reconstructPdfPageLines(items: PDFTextItem[]): string {
  if (!Array.isArray(items) || items.length === 0) return "";

  let output = "";
  let lastY: number | null = null;
  let prevEndedWithEOL = false;

  for (const item of items) {
    const rawStr = typeof item?.str === "string" ? item.str : "";
    const hasCoords = Array.isArray(item?.transform) && typeof item.transform[5] === "number";
    const y = hasCoords ? (item.transform as number[])[5] : null;

    if (!rawStr) {
      if (item?.hasEOL) {
        prevEndedWithEOL = true;
      }
      continue;
    }

    if (lastY !== null && y !== null) {
      const dy = Math.abs(lastY - y);
      if (dy > 16) {
        output += "\n\n";
      } else if (dy > 3.5 || prevEndedWithEOL) {
        output += "\n";
      } else if (
        output.length > 0 &&
        !/[\s\n]$/.test(output) &&
        !/^\s/.test(rawStr)
      ) {
        output += " ";
      }
    } else if (prevEndedWithEOL && output.length > 0 && !output.endsWith("\n")) {
      output += "\n";
    } else if (
      output.length > 0 &&
      !/[\s\n]$/.test(output) &&
      !/^\s/.test(rawStr)
    ) {
      output += " ";
    }

    output += rawStr;
    if (y !== null) {
      lastY = y;
    }
    prevEndedWithEOL = Boolean(item?.hasEOL);
  }

  return output
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract text from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  try {
    // Get pdfjs library (client-side only)
    const pdfjs = await getPdfjsLib();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    const pageTexts: string[] = [];
    
    // Extract text from each page while preserving line breaks
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = reconstructPdfPageLines((textContent?.items || []) as PDFTextItem[]);
      if (pageText) {
        pageTexts.push(pageText);
      }
    }
    
    const cleanedText = pageTexts
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    
    return {
      text: cleanedText,
      pageCount,
      success: true,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error extracting PDF',
    };
  }
}


/**
 * Check if a file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

