import React from "react";
import ReactMarkdown from "react-markdown";
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
        {newResume && <CopyButton textToCopy={newResume} loading={loading} />}
      </div>
      <div id="resume" className="border border-gray-300 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800 shadow-sm min-h-[800px] prose prose-lg dark:prose-invert max-w-none">
        {loading ? (
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex flex-col space-y-2">
              <div className="h-8 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer"></div>
              <div className="h-4 w-1/2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-200"></div>
            </div>
            
            {/* Contact info skeleton */}
            <div className="flex flex-wrap gap-3 justify-center">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={`contact-${i}`} 
                  className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-300"
                />
              ))}
            </div>
            
            {/* Section skeletons */}
            {[1, 2, 3].map((section) => (
              <div key={`section-${section}`} className="space-y-3 mt-6">
                <div className="h-6 w-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-400"></div>
                
                {/* Experience items */}
                {[1, 2].map((item) => (
                  <div key={`item-${section}-${item}`} className="space-y-2 ml-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2">
                    <div className="h-5 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-500"></div>
                    <div className="h-4 w-1/3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-600"></div>
                    <div className="space-y-1 mt-2">
                      {[1, 2, 3].map((bullet) => (
                        <div key={`bullet-${section}-${item}-${bullet}`} className="flex">
                          <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-700"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
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
            {newResume || "No content available yet."}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default TailoredResumeOutput;
