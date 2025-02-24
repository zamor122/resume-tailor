import React from "react";
import { analytics } from "../services/analytics";

interface ResumeInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTitleDetected?: (title: string, confidence: number) => void;
}

const JobDescriptionInput: React.FC<ResumeInputProps> = ({ 
  label, 
  placeholder, 
  value, 
  onChange,
  onTitleDetected
}) => {
  const handleBlur = async () => {
    if (value.length >= 100) {
      try {
        const response = await fetch('/api/tailor/job/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: value })
        });

        if (!response.ok) throw new Error('Failed to extract job title');
        
        const data = await response.json();
        
        onTitleDetected?.(data.jobTitle, data.confidence);
        
        analytics.trackEvent({
          name: 'job_description_analysis',
          properties: {
            detectedTitle: data.jobTitle,
            confidence: data.confidence,
            descriptionLength: value.length
          }
        });
      } catch (error) {
        console.error('Error analyzing job description:', error);
      }
    }
  };

  return (
    <div className="glass-card">
      <label className="text-lg font-semibold text-gray-800 dark:text-gray-100">{label}</label>
      <textarea
        className="input-textarea"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default JobDescriptionInput;
