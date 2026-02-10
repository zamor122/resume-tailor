/**
 * Client-side PDF generation utility
 * Uses browser APIs to generate PDF from HTML
 */

export async function generatePDFFromHTML(html: string, filename: string = "resume.pdf"): Promise<void> {
  // Create a temporary iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  
  document.body.appendChild(iframe);
  
  // Write HTML to iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    throw new Error("Failed to access iframe document");
  }
  
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();
  
  // Wait for content to load
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Use browser print to PDF
  iframe.contentWindow?.print();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}

/**
 * Alternative: Use jsPDF (requires jsPDF library)
 */
export async function generatePDFWithJsPDF(content: string, filename: string = "resume.pdf"): Promise<void> {
  // This would require jsPDF to be installed
  // For now, we'll use the print method above
  // In production, you might want to use a proper PDF library
  
  // Example with jsPDF (if installed):
  // const { jsPDF } = await import('jspdf');
  // const doc = new jsPDF();
  // doc.text(content, 10, 10);
  // doc.save(filename);
  
  throw new Error("jsPDF not implemented. Use generatePDFFromHTML instead.");
}





