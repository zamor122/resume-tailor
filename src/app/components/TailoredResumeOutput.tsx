import React from 'react';
import ReactMarkdown from 'react-markdown';
import CopyButton from './CopyButton';

interface TailoredResumeOutputProps {
  newResume: string;
  loading: boolean;
  detectedTitle?: string;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ 
  newResume, 
  loading,
  detectedTitle,
}) => {
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center pb-4">
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-bold text-primary">
            {detectedTitle 
              ? `Tailored Resume for ${detectedTitle}` 
              : "Your Tailored Resume"}
          </h2>
        </div>
        {newResume && <CopyButton loading={loading} />}
      </div>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        {loading ? (
          <div className="space-y-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
          </div>
        ) : (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-2 text-primary">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold text-primary">{children}</h2>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-foreground">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-foreground">{children}</li>
              ),
            }}
          >
            {newResume || "No content available yet."}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default TailoredResumeOutput;
