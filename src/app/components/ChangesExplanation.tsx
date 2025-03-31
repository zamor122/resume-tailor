import React from 'react';
import ReactMarkdown from 'react-markdown';

const ChangesExplanation: React.FC<{ changes: string; error?: string; loading?: boolean }> = ({ changes, error, loading }) => {
  if (error) {
    return (
      <div className="mb-4 p-4 bg-pink-50 dark:bg-red-900/20 text-pink-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="changes-container bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-lg transition-all duration-300">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-amber-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="changes-container bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-lg transition-all duration-300">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Changes Made
      </h2>
      
      <div className="prose prose-amber dark:prose-invert max-w-none">
        <ReactMarkdown>{changes}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ChangesExplanation; 