import React from 'react';

export interface RelevancyScores {
  before: number;
  after: number;
  improvement: string;
}

interface RelevancyScoreProps {
  scores: RelevancyScores | null;
  error: string | null;
  loading?: boolean;
  visible?: boolean;
}

const RelevancyScore: React.FC<RelevancyScoreProps> = ({ scores, error, loading, visible = false }) => {
  if (!visible && !scores && !loading) {
    return null;
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (loading || !scores) {
    return (
      
      <div className="transparent-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Relevancy Score
          </h3>
          <div className="h-8 w-20 bg-gradient-to-r from-green-200 via-green-300 to-green-200 dark:from-green-700 dark:via-green-600 dark:to-green-700 rounded-full animate-shimmer animation-delay-200"></div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Original Resume Score */}
          <div className="w-full md:w-1/2 space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Original Resume
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-400"></div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                match
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 rounded-full animate-shimmer animation-delay-600"></div>
            </div>
          </div>
          
          {/* Tailored Resume Score */}
          <div className="w-full md:w-1/2 space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Tailored Resume
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-400"></div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                match
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-green-300 via-green-400 to-green-300 dark:from-green-600 dark:via-green-500 dark:to-green-600 rounded-full animate-shimmer animation-delay-600"></div>
            </div>
          </div>
        </div>
        
        {/* Improvement explanation */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-green-200 via-green-300 to-green-200 dark:from-green-700 dark:via-green-600 dark:to-green-700 animate-shimmer animation-delay-700"></div>
            <div className="h-4 w-4/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-800"></div>
          </div>
        </div>
      </div>
    );
  }

  const isPositive = scores.improvement.startsWith('+');
  const improvementValue = scores.improvement.replace(/[+\-%]/g, '');

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Relevancy Score
        </h3>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-lg font-bold ${
          isPositive 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {scores.improvement}
        </span>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Original Resume Score */}
        <div className="w-full md:w-1/2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Original Resume
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              {scores.before}%
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              match
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gray-500 h-2.5 rounded-full"
              style={{ width: `${scores.before}%` }}
            />
          </div>
        </div>
        
        {/* Tailored Resume Score */}
        <div className="w-full md:w-1/2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tailored Resume
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              {scores.after}%
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              match
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full"
              style={{ width: `${scores.after}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Improvement explanation */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-full ${isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <svg className={`w-5 h-5 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isPositive ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              )}
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isPositive 
              ? `Your resume is now ${improvementValue}% more relevant to the job description!` 
              : `Your resume relevancy has decreased by ${improvementValue}%. Please review the changes.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RelevancyScore; 