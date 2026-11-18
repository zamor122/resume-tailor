"use client";

import React, { useRef } from "react";
import { getInputFontSizeClass } from "@/app/utils/fontSize";
import { analytics } from "@/app/services/analytics";

const MIN_CHARS = 100;
const PASTE_DELTA_THRESHOLD = 50;

interface ResumeInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  fontSize?: "small" | "medium" | "large";
  fileDropComponent?: React.ReactNode;
}

const ResumeInput: React.FC<ResumeInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  fontSize = "medium",
  fileDropComponent,
}) => {
  const inputStartedFired = useRef(false);
  const prevLengthRef = useRef(0);
  const fontSizeClass = getInputFontSizeClass(fontSize);
  const charCount = value.length;
  const isSufficient = charCount >= MIN_CHARS;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newLen = newValue.length;

    if (newLen >= 10 && !inputStartedFired.current) {
      inputStartedFired.current = true;
      analytics.trackEvent(analytics.events.RESUME_INPUT_STARTED, {
        ...analytics.getTrackingContext({ section: "tailorResume", element: "resume_textarea" }),
        charCount: newLen,
      });
    }
    if (newLen - prevLengthRef.current >= PASTE_DELTA_THRESHOLD) {
      analytics.trackEvent(analytics.events.RESUME_PASTED, {
        ...analytics.getTrackingContext({ section: "tailorResume", element: "resume_textarea" }),
        charCount: newLen,
        inputMethod: "paste",
      });
    }
    prevLengthRef.current = newLen;
    onChange(e);
  };

  return (
    <div className="input-container flex flex-col flex-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#1C2028] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="neo-tag bg-[#FF5722] text-white text-xs px-2.5 py-1 font-mono font-bold border border-[#1C2028] shadow-[1px_1px_0px_#1C2028]">
            STEP 01
          </span>
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-mono font-bold text-[#1C2028] leading-tight mb-0">
              YOUR CURRENT RESUME
            </h2>
            <p className="text-[11px] sm:text-xs font-mono text-gray-600 mb-0">
              Upload PDF/TXT or paste text below
            </p>
          </div>
        </div>
        <span
          className={`neo-tag text-[11px] font-mono font-bold px-2.5 py-1 border border-[#1C2028] ${
            charCount === 0
              ? "bg-white text-gray-500 shadow-[1px_1px_0px_#1C2028]"
              : isSufficient
                ? "bg-[#10B981] text-white shadow-[1px_1px_0px_#1C2028]"
                : "bg-[#F59E0B] text-white shadow-[1px_1px_0px_#1C2028]"
          }`}
        >
          {charCount.toLocaleString()} CHARS
          {charCount > 0 && charCount < MIN_CHARS && (
            <span className="ml-1 opacity-90">(MIN {MIN_CHARS})</span>
          )}
          {isSufficient && charCount > 0 && (
            <span className="ml-1">READY ✓</span>
          )}
        </span>
      </div>

      {fileDropComponent && (
        <div className="space-y-3">
          {fileDropComponent}
          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-mono font-bold text-gray-500 uppercase tracking-wider my-1">
            <div className="h-[2px] flex-1 bg-[#1C2028]/15" />
            <span>OR PASTE RESUME TEXT DIRECTLY</span>
            <div className="h-[2px] flex-1 bg-[#1C2028]/15" />
          </div>
        </div>
      )}

      <textarea
        id="resume"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`form-textarea ${fontSizeClass} flex-1 min-h-[200px] md:min-h-[260px]`}
        aria-label={label}
      />
    </div>
  );
};

export default ResumeInput;
