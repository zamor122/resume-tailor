import React from "react";

interface ResumeInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const ResumeInput: React.FC<ResumeInputProps> = ({ label, placeholder, value, onChange }) => {
  return (
    <div className="glass-card">
      <label className="text-lg font-semibold text-gray-800 dark:text-gray-100">{label}</label>
      <textarea
        className="input-textarea"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default ResumeInput;
