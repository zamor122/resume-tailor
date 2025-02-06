import React, { useState } from 'react';

const CopyButton: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyToClip = (htmlStr: string, plainStr: string) => {
    function listener(e: ClipboardEvent) {
      e.clipboardData?.setData("text/html", htmlStr);
      e.clipboardData?.setData("text/plain", plainStr);
      e.preventDefault();
    }
  
    document.addEventListener("copy", listener);
    document.execCommand("copy");
    document.removeEventListener("copy", listener);
  };
  
  const handleCopy = () => {
    try {
      const element = document.getElementById("resume"); // Ensure element exists
      if (!element) {
        console.error("Element with ID 'resume' not found");
        return;
      }
  
      const htmlContent = element.innerHTML.trim();
      const plainText = element.textContent?.trim() || "";
  
      copyToClip(htmlContent, plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };
  

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-all duration-200 ease-in-out"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>Copy Resume</span>
        </>
      )}
    </button>
  );
};

export default CopyButton; 