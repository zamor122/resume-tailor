import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";  // Make sure you have this installed
import CopyButton from "./CopyButton";

interface TailoredResumeOutputProps {
  newResume: string;
  loading?: boolean;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ newResume, loading }) => {
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Your Tailored Resume
        </h2>
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
