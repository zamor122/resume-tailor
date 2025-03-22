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
      <div className="relevancy-container bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg transition-all duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-foreground-darker">
            Relevancy Score
          </h3>
          <div className="h-8 w-20 bg-gradient-to-r from-green-200/50 via-green-300/50 to-green-200/50 dark:from-green-700/50 dark:via-green-600/50 dark:to-green-700/50 rounded-full animate-shimmer animation-delay-200"></div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Original Resume Score */}
          <div className="w-full md:w-1/2 space-y-2">
            <p className="text-sm font-medium text-foreground-darker mb-1">
              Original Resume
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-12 bg-gradient-to-r from-gray-200/50 via-gray-300/50 to-gray-200/50 dark:from-gray-700/50 dark:via-gray-600/50 dark:to-gray-700/50 rounded animate-shimmer animation-delay-400"></div>
              <span className="text-xs font-medium text-foreground-darker">
                match
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-gray-300/50 via-gray-400/50 to-gray-300/50 dark:from-gray-600/50 dark:via-gray-500/50 dark:to-gray-600/50 rounded-full animate-shimmer animation-delay-600"></div>
            </div>
          </div>
          
          {/* Tailored Resume Score */}
          <div className="w-full md:w-1/2 space-y-2">
            <p className="text-sm font-medium text-foreground-darker mb-1">
              Tailored Resume
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-12 bg-gradient-to-r from-gray-200/50 via-gray-300/50 to-gray-200/50 dark:from-gray-700/50 dark:via-gray-600/50 dark:to-gray-700/50 rounded animate-shimmer animation-delay-400"></div>
              <span className="text-xs font-medium text-foreground-darker">
                match
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-green-300/50 via-green-400/50 to-green-300/50 dark:from-green-600/50 dark:via-green-500/50 dark:to-green-600/50 rounded-full animate-shimmer animation-delay-600"></div>
            </div>
          </div>
        </div>
        
        {/* Improvement explanation */}
        <div className="mt-6 pt-4 border-t border-gray-200/20 dark:border-gray-700/20">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-green-200/50 via-green-300/50 to-green-200/50 dark:from-green-700/50 dark:via-green-600/50 dark:to-green-700/50 animate-shimmer animation-delay-700"></div>
            <div className="h-4 w-4/5 bg-gradient-to-r from-gray-200/50 via-gray-300/50 to-gray-200/50 dark:from-gray-700/50 dark:via-gray-600/50 dark:to-gray-700/50 rounded animate-shimmer animation-delay-800"></div>
          </div>
        </div>
      </div>
    );
  }

  const isPositive = scores.improvement.startsWith('+');
  const improvementValue = scores.improvement.replace(/[+\-%]/g, '');

  return (
    <div className="relevancy-container backdrop-blur-lg transition-all duration-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-foreground-darker">
          Relevancy Score
        </h3>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-lg font-bold ${
          isPositive 
            ? 'dark:bg-green-100/80 dark:text-green-800 bg-green-900/30 text-green-400' 
            : 'dark:bg-red-100/80 dark:text-red-800 bg-red-900/30 text-red-400'
        }`}>
          {scores.improvement}
        </span>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Original Resume Score */}
        <div className="w-full md:w-1/2">
          <p className="text-sm font-medium text-foreground-darker mb-1">
            Original Resume
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-foreground-darker">
              {scores.before}%
            </span>
            <span className="text-xs font-medium text-foreground-darker">
              match
            </span>
          </div>
          <div className="w-full dark:bg-gray-200/50 bg-gray-700/50 rounded-full h-2.5">
            <div
              className="dark:bg-gray-500/80 bg-gray-500/50 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scores.before}%` }}
            />
          </div>
        </div>
        
        {/* Tailored Resume Score */}
        <div className="w-full md:w-1/2">
          <p className="text-sm font-medium text-foreground-darker mb-1">
            Tailored Resume
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-foreground-darker">
              {scores.after}%
            </span>
            <span className="text-xs font-medium text-foreground-darker">
              match
            </span>
          </div>
          <div className="w-full dark:bg-gray-200/50 bg-gray-700/50 rounded-full h-2.5">
            <div
              className="dark:bg-green-500/80 bg-green-500/50 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scores.after}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Improvement explanation */}
      <div className="mt-6 pt-4 border-t dark:border-gray-200/20 border-gray-700/20">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-full ${isPositive ? 'dark:bg-green-100/80 bg-green-900/30' : 'dark:bg-red-100/80 bg-red-900/30'}`}>
            <svg className={`w-5 h-5 ${isPositive ? 'dark:text-green-600 text-green-400' : 'dark:text-red-600 text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isPositive ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              )}
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground-darker">
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