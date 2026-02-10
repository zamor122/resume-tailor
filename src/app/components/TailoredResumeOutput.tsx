import React from 'react';
import ReactMarkdown from 'react-markdown';
import CopyButton from './CopyButton';
import { getProseFontSizeClass } from '@/app/utils/fontSize';
import type { FormatSpec } from '@/app/types/format';

interface TailoredResumeOutputProps {
  newResume: string;
  loading: boolean;
  detectedTitle?: string;
  error?: string;
  fontSize?: "small" | "medium" | "large";
  formatSpec?: FormatSpec | null;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ 
  newResume, 
  loading,
  //detectedTitle,
  error,
  fontSize = "medium",
  formatSpec = null,
}) => {
  const proseFontSizeClass = getProseFontSizeClass(fontSize);
  const formatStyles = formatSpec ? {
    fontFamily: formatSpec.fontFamily,
    fontSize: `${formatSpec.fontSize.base}pt`,
    lineHeight: formatSpec.lineHeight,
    padding: `${formatSpec.margins.top}px ${formatSpec.margins.right}px ${formatSpec.margins.bottom}px ${formatSpec.margins.left}px`,
  } : undefined;
  if (error) {
    return (
      <div className="mb-4 p-4 bg-pink-50 dark:bg-red-900/20 text-pink-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="resume-output-container">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-7 bg-emerald-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-7 w-12 bg-emerald-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-output-container bg-white/90 dark:bg-gray-900 backdrop-blur-lg transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Tailored Resume
        </h2>
        <CopyButton text={newResume} />
      </div>
      
      <div
        className={`prose prose-emerald dark:prose-invert max-w-none resume-prose ${proseFontSizeClass} pb-4`}
        style={formatStyles}
        data-format-spec={formatSpec ? JSON.stringify(formatSpec) : undefined}
      >
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="!mt-0 !mb-1">{children}</h1>,
            h2: ({ children }) => <h2>{children}</h2>,
            p: ({ children }) => <p className="!my-2">{children}</p>,
            ul: ({ children }) => <ul className="!my-3 !pl-5 space-y-2">{children}</ul>,
            li: ({ children }) => <li className="!mb-1">{children}</li>,
          }}
        >
          {newResume}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default TailoredResumeOutput;
