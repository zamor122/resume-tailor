"use client";

interface ResumeScorecardProps {
  matchScore: {
    before: number;
    after: number;
  };
  improvementMetrics?: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
  };
  missingKeywords?: string[];
}

export default function ResumeScorecard({
  matchScore,
  improvementMetrics,
  missingKeywords = [],
}: ResumeScorecardProps) {
  const improvement = matchScore.after - matchScore.before;
  const improvementPercent = ((improvement / matchScore.before) * 100).toFixed(0);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Main Score Display */}
      <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-xl p-6 border-2 border-blue-500/30 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-sm text-gray-400 mb-2">ATS Match Score</div>
            <div className="text-5xl font-bold text-white mb-1">
              {matchScore.before}% → {matchScore.after}%
            </div>
            <div className="text-lg text-gray-300">
              Potential improvement: <span className="text-green-400 font-semibold">+{improvement} points</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-3xl font-bold text-green-400 mb-1">
              +{improvementPercent}%
            </div>
            <div className="text-sm text-gray-400">Improvement</div>
          </div>
        </div>
      </div>

      {/* Improvement Metrics */}
      {improvementMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {improvementMetrics.quantifiedBulletsAdded !== undefined && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {improvementMetrics.quantifiedBulletsAdded}
              </div>
              <div className="text-xs text-gray-400">
                Quantified Bullets Added
              </div>
            </div>
          )}
          {improvementMetrics.atsKeywordsMatched !== undefined && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {improvementMetrics.atsKeywordsMatched}
              </div>
              <div className="text-xs text-gray-400">
                ATS Keywords Matched
              </div>
            </div>
          )}
          {improvementMetrics.activeVoiceConversions !== undefined && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-pink-400 mb-1">
                {improvementMetrics.activeVoiceConversions}
              </div>
              <div className="text-xs text-gray-400">
                Active Voice Conversions
              </div>
            </div>
          )}
          {improvementMetrics.sectionsOptimized !== undefined && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {improvementMetrics.sectionsOptimized}
              </div>
              <div className="text-xs text-gray-400">
                Sections Optimized
              </div>
            </div>
          )}
        </div>
      )}

      {/* Missing Keywords */}
      {missingKeywords.length > 0 && (
        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
          <div className="text-sm font-semibold text-yellow-400 mb-2">
            Missing Keywords Found
          </div>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.slice(0, 10).map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium"
              >
                {keyword}
              </span>
            ))}
            {missingKeywords.length > 10 && (
              <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-400 text-xs">
                +{missingKeywords.length - 10} more
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            These keywords were identified in the job description but are missing from your resume.
          </div>
        </div>
      )}
    </div>
  );
}





