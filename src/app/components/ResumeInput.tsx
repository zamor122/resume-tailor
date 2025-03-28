import React from "react";

interface ResumeInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const ResumeInput: React.FC<ResumeInputProps> = ({ label, placeholder, value, onChange }) => {
  return (
    <div className="input-container">
<h2 className="text-2xl pb-4 font-bold gradient-current-resume">
  {label}
</h2>      <textarea
        id="resume"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default ResumeInput;
