"use client";

import { useState } from "react";

const SITE_URL = "https://airesumetailor.com";
const SHARE_TEXT =
  "I just tailored my resume for a job with AI Resume Tailor - free resume optimization with job matching. Check it out!";

export default function ShareResumeCard() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = SITE_URL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SITE_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  return (
    <div className="output-container p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Share this tool
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Get a friend to try it—free resume optimization with job matching.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={handleShareLinkedIn}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
        >
          Share on LinkedIn
        </button>
        <button
          type="button"
          onClick={handleShareTwitter}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors"
        >
          Share on X
        </button>
      </div>
    </div>
  );
}
