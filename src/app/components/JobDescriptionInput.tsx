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
    // Only attempt to extract title if there's enough content
    if (value.length < 50) return;

    try {
      const response = await fetch('/api/tailor/job/title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Job title extraction failed:', errorData);
        return;
      }

      const data = await response.json();
      if (data.jobTitle && onTitleDetected) {
        onTitleDetected(data.jobTitle, data.confidence);
        analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
          success: true,
          titleSearched: data.jobTitle
        });
      }
    } catch (error) {
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
        success: false,
        error: error instanceof Error ? error.message : error
      });
      console.warn('Error analyzing job description:', error);
      // Don't throw the error - just log it and continue
    }
  };

  return (
    <div className="input-container">
<h2 className="text-2xl pb-4 font-bold gradient-job-description">
  {label}
</h2>      <textarea
        id="jobDescription"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default JobDescriptionInput;
