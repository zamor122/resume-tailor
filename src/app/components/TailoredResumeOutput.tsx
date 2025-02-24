import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";  // Make sure you have this installed
import CopyButton from "./CopyButton";

interface TailoredResumeOutputProps {
  newResume: string;
  loading?: boolean;
  detectedTitle?: string;
  confidence?: number;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ 
  newResume, 
  loading,
  detectedTitle,
  confidence 
}) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (newResume) {
      setIsTyping(true);
      let currentIndex = 0;
      const words = newResume.split(/(\s+)/); // Split by whitespace but keep separators
      
      const typeNextWord = () => {
        if (currentIndex < words.length) {
          setDisplayedContent(prev => prev + words[currentIndex]);
          currentIndex++;
          timeoutRef.current = setTimeout(typeNextWord, 20); // Adjust speed here
        } else {
          setIsTyping(false);
        }
      };

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setDisplayedContent(""); // Reset content
      typeNextWord();

      // Cleanup
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [newResume]);

  console.log('TailoredResumeOutput rendering:', {
    hasContent: Boolean(newResume),
    contentLength: newResume?.length || 0,
    loading
  });

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center pb-4">
      <div className="flex-1 pr-4">
      <div className="flex flex-col sm:flex-row items-start justify-between pb-4 gap-4 sm:gap-0">
        <div className="order-2 sm:order-1 w-full sm:w-auto sm:pr-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-y-2 sm:gap-x-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {detectedTitle 
                ? `Tailored Resume for ${detectedTitle}` 
                : "Your Tailored Resume"}
            </h2>
            <div className="relative group inline-flex items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                ({confidence ?? 0}%)
              </span>
              <svg 
                className="w-4 h-4 ml-1 text-gray-500 dark:text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                Confidence rating in detected job title
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
        {newResume && <CopyButton loading={loading || isTyping} />}
      </div>
      <div id="resume" className="border border-gray-300 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800 shadow-sm min-h-[800px] prose prose-lg dark:prose-invert max-w-none">
        {loading && !newResume ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded"
              />
            ))}
          </div>
        ) : (
          <>
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
              className="transition-all duration-100"
            >
              {displayedContent || "Waiting for content..."}
            </ReactMarkdown>
            {isTyping && (
              <span className="inline-block w-1 h-4 ml-1 bg-gray-900 dark:bg-gray-100 animate-pulse" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TailoredResumeOutput;
