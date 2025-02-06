import React from "react";
import ReactMarkdown from "react-markdown";  // Make sure you have this installed

interface TailoredResumeOutputProps {
  newResume: string;
  loading?: boolean;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ newResume, loading }) => {
  if (loading) {
    return (
      <div className="glass-card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 pb-4">
          Your Tailored Resume
        </h2>
        <div className="animate-pulse border border-gray-300 dark:border-gray-700 rounded-lg p-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-sm min-h-[800px]" />
      </div>
    );
  }

  return (
    newResume && (
      <div className="glass-card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 pb-4">
          Your Tailored Resume
        </h2>
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800 shadow-sm min-h-[800px] prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">{children}</h2>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-gray-700 dark:text-gray-300">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-gray-700 dark:text-gray-300">{children}</li>
              ),
            }}
          >
            {newResume}
          </ReactMarkdown>
        </div>
      </div>
    )
  );
};

export default TailoredResumeOutput;
