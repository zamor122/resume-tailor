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
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    // Clean up the text (remove excessive whitespace, normalize line breaks)
    const cleanedText = fullText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
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

