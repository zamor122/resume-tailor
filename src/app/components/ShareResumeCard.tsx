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
    <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-5 sm:p-6 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <span className="neo-tag bg-[#FF5722] text-white text-[9px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
          SHARE &amp; REFER
        </span>
        <h3 className="text-base sm:text-lg font-mono font-bold text-[#1C2028]">
          Share With A Peer
        </h3>
      </div>
      <p className="text-xs sm:text-sm font-mono text-gray-700 leading-relaxed">
        Help another job seeker get their resume tuned for ATS and recruiter screens with 1-click tailoring.
      </p>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleCopyLink}
          className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase rounded-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] bg-white hover:bg-[#F4F1EA] text-[#1C2028] active:translate-x-[1px] active:translate-y-[1px]"
        >
          {copied ? "✓ Copied to clipboard" : "📋 Copy link"}
        </button>
        <button
          type="button"
          onClick={handleShareLinkedIn}
          className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase rounded-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] bg-[#0A66C2] text-white hover:bg-[#004182] active:translate-x-[1px] active:translate-y-[1px]"
        >
          Share on LinkedIn
        </button>
        <button
          type="button"
          onClick={handleShareTwitter}
          className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase rounded-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] bg-[#1C2028] text-white hover:bg-black active:translate-x-[1px] active:translate-y-[1px]"
        >
          Share on X
        </button>
      </div>
    </div>
  );
}
