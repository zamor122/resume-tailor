import React, { useState } from 'react';

interface CopyButtonProps {
  loading?: boolean;
}

const CopyButton: React.FC<CopyButtonProps> = ({ loading }) => {
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
  
  if (loading) {
    return (
      <button 
        disabled
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-400 rounded-lg cursor-not-allowed"
      >
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Generating...</span>
      </button>
    );
  }

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