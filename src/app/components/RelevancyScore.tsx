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
      <div className="mb-4 p-4 bg-pink-50 dark:bg-red-900/20 text-pink-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (loading || !scores) {
    return (
      <div className="relevancy-container">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Relevancy Score
          </h3>
          <div className="h-8 w-20 bg-gradient-to-r from-cyan-500/50 via-cyan-600/50 to-cyan-500/50 dark:from-blue-400/50 dark:via-blue-500/50 dark:to-blue-400/50 rounded-full animate-shimmer animation-delay-200"></div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Original Resume Score */}
          <div className="w-full md:w-1/2 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Original Resume
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-12 bg-gradient-to-r from-amber-500/50 via-amber-600/50 to-amber-500/50 dark:from-yellow-400/50 dark:via-yellow-500/50 dark:to-yellow-400/50 rounded animate-shimmer animation-delay-400"></div>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                match
              </span>
            </div>
            <div className="w-full h-2.5 bg-amber-500/30 dark:bg-yellow-400/30 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-amber-500/80 via-amber-600/80 to-amber-500/80 dark:from-yellow-400/80 dark:via-yellow-500/80 dark:to-yellow-400/80 rounded-full animate-shimmer animation-delay-600"></div>
            </div>
          </div>
          
          {/* Tailored Resume Score */}
          <div className="w-full md:w-1/2 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Tailored Resume
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-12 bg-gradient-to-r from-cyan-500/50 via-cyan-600/50 to-cyan-500/50 dark:from-blue-400/50 dark:via-blue-500/50 dark:to-blue-400/50 rounded animate-shimmer animation-delay-400"></div>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                match
              </span>
            </div>
            <div className="w-full h-2.5 bg-cyan-500/30 dark:bg-blue-400/30 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-cyan-500/80 via-cyan-600/80 to-cyan-500/80 dark:from-blue-400/80 dark:via-blue-500/80 dark:to-blue-400/80 rounded-full animate-shimmer animation-delay-600"></div>
            </div>
          </div>
        </div>
        
        {/* Improvement explanation */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 dark:border-yellow-400/20">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-emerald-500/50 via-emerald-600/50 to-emerald-500/50 dark:from-purple-400/50 dark:via-purple-500/50 dark:to-purple-400/50 animate-shimmer animation-delay-700"></div>
            <div className="h-4 w-4/5 bg-gradient-to-r from-amber-500/50 via-amber-600/50 to-amber-500/50 dark:from-yellow-400/50 dark:via-yellow-500/50 dark:to-yellow-400/50 rounded animate-shimmer animation-delay-800"></div>
          </div>
        </div>
      </div>
    );
  }

  const isPositive = scores.improvement.startsWith('+');
  const isNoChange = scores.before === scores.after;
  const improvementValue = scores.improvement.replace(/[+\-%]/g, '');
  const isLowRelevancy = scores.before < 40 && scores.after < 40;

  return (
    <div className="relevancy-container bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-lg transition-all duration-200 border-cyan-500/20 dark:border-blue-400/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Relevancy Score
        </h3>
        {!isNoChange && (
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-lg font-bold ${
            isPositive 
              ? 'bg-cyan-500/20 text-cyan-700 dark:bg-blue-400/20 dark:text-blue-300' 
              : 'bg-pink-500/20 text-pink-700 dark:bg-red-400/20 dark:text-red-300'
          }`}>
            {scores.improvement}
          </span>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Original Resume Score */}
        <div className="w-full md:w-1/2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Original Resume
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {scores.before}%
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              match
            </span>
          </div>
          <div className="w-full bg-amber-500/30 dark:bg-yellow-400/30 rounded-full h-2.5">
            <div
              className="bg-amber-500 dark:bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scores.before}%` }}
            />
          </div>
        </div>
        
        {/* Tailored Resume Score */}
        <div className="w-full md:w-1/2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Tailored Resume
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {scores.after}%
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              match
            </span>
          </div>
          <div className="w-full bg-cyan-500/30 dark:bg-blue-400/30 rounded-full h-2.5">
            <div
              className="bg-cyan-500 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scores.after}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Improvement explanation */}
      <div className="mt-6 pt-4 border-t border-amber-500/20 dark:border-yellow-400/20">
        <div className="flex items-center gap-2">
          {!isNoChange ? (
            <>
              <div className={`p-1 rounded-full ${
                isPositive 
                  ? 'bg-cyan-500/20 dark:bg-blue-400/20' 
                  : 'bg-pink-500/20 dark:bg-red-400/20'
              }`}>
                <svg className={`w-5 h-5 ${
                  isPositive 
                    ? 'text-cyan-600 dark:text-blue-400' 
                    : 'text-pink-600 dark:text-red-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isPositive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  )}
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isPositive 
                  ? `Your resume is now ${improvementValue}% more relevant to the job description!` 
                  : `Your resume relevancy has decreased by ${improvementValue}%. Please review the changes.`}
              </p>
            </>
          ) : (
            <>
              <div className={`p-1 rounded-full ${
                isLowRelevancy 
                  ? 'bg-pink-500/20 dark:bg-red-400/20' 
                  : 'bg-emerald-500/20 dark:bg-emerald-400/20'
              }`}>
                <svg className={`w-5 h-5 ${
                  isLowRelevancy 
                    ? 'text-pink-600 dark:text-red-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isLowRelevancy ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  )}
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isLowRelevancy 
                  ? `We're sorry, but your experience doesn't appear to match the job qualifications. Your relevancy score of ${scores.after}% is below our recommended threshold.` 
                  : `Your resume already matches the job description perfectly! No changes were necessary to improve your relevancy score of ${scores.after}%.`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelevancyScore; 