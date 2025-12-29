import React from "react";
import { getInputFontSizeClass } from "@/app/utils/fontSize";

interface ResumeInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  fontSize?: "small" | "medium" | "large";
}

const ResumeInput: React.FC<ResumeInputProps> = ({ label, placeholder, value, onChange, fontSize = "medium" }) => {
  const fontSizeClass = getInputFontSizeClass(fontSize);
  return (
    <div className="input-container">
<h2 className="text-2xl pb-4 font-bold gradient-current-resume">
  {label}
</h2>      <textarea
        id="resume"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={fontSizeClass}
      />
    </div>
  );
};

export default ResumeInput;
