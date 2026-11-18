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
}

const ResumeInput: React.FC<ResumeInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  fontSize = "medium",
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
    <div className="input-container">
      <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#1C2028]">
        <h2 className="text-base sm:text-lg md:text-xl font-mono font-bold text-[#1C2028] flex items-center gap-2 mb-0">
          <span className="w-6 h-6 rounded bg-[#FF5722] text-white flex items-center justify-center text-xs border border-[#1C2028] shadow-[1px_1px_0px_#1C2028]">01</span>
          <span>YOUR RESUME</span>
        </h2>
        <span
          className={`neo-tag text-[11px] font-mono font-bold px-2 py-0.5 border border-[#1C2028] ${
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
        </span>
      </div>
      <textarea
        id="resume"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`form-textarea ${fontSizeClass}`}
        aria-label={label}
      />
    </div>
  );
};

export default ResumeInput;
