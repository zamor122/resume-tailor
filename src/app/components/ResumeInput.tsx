"use client";

import React from "react";
import { getInputFontSizeClass } from "@/app/utils/fontSize";

const MIN_CHARS = 100;

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
  const fontSizeClass = getInputFontSizeClass(fontSize);
  const charCount = value.length;
  const isSufficient = charCount >= MIN_CHARS;

  return (
    <div className="input-container">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl md:text-2xl font-bold gradient-current-resume form-label mb-0">
          {label}
        </h2>
        <span
          className={`text-xs font-medium tabular-nums transition-colors duration-200 ${
            charCount === 0
              ? "text-gray-500 dark:text-gray-400"
              : isSufficient
                ? "text-cyan-500 dark:text-cyan-400"
                : "text-amber-500 dark:text-amber-400"
          }`}
        >
          {charCount.toLocaleString()} chars
          {charCount > 0 && charCount < MIN_CHARS && (
            <span className="ml-1 opacity-80">(min {MIN_CHARS})</span>
          )}
        </span>
      </div>
      <textarea
        id="resume"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`form-textarea ${fontSizeClass}`}
        aria-label={label}
      />
    </div>
  );
};

export default ResumeInput;
