import React from "react";
import ReactMarkdown from "react-markdown";  // Make sure you have this installed

interface TailoredResumeOutputProps {
  newResume: string;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ newResume }) => {
  return (
    newResume && (
      <div className="glass-card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 pb-4">
          Your Tailored Resume
        </h2>
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
          <ReactMarkdown>{newResume}</ReactMarkdown> {/* Render the markdown */}
        </div>
      </div>
    )
  );
};

export default TailoredResumeOutput;
