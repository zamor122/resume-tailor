"use client";

import { useState, useEffect, useRef } from "react";

interface RealtimeATSScoreProps {
  resume: string;
  jobDescription: string;
  onScoreChange?: (score: number) => void;
}

export default function RealtimeATSScore({
  resume,
  jobDescription,
  onScoreChange,
}: RealtimeATSScoreProps) {
  const [score, setScore] = useState<number | null>(null);
  const [jdCoverage, setJdCoverage] = useState<number | null>(null);
  const [criticalKeywords, setCriticalKeywords] = useState<{
    matched: number;
    total: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!resume || !jobDescription || jobDescription.length < 10) {
      setScore(null);
      setJdCoverage(null);
      setCriticalKeywords(null);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/realtime-ats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        });

        if (response.ok) {
          const data = await response.json();
          setPrevScore((prev) => (score !== null ? score : prev ?? data.score));
          setScore(data.score);
          setJdCoverage(data.jdCoverage ?? data.metrics?.jdCoverage?.percentage ?? null);
          setCriticalKeywords(
            data.criticalKeywords
              ? { matched: data.criticalKeywords.matched, total: data.criticalKeywords.total }
              : data.metrics?.criticalKeywords
                ? { matched: data.metrics.criticalKeywords.matched, total: data.metrics.criticalKeywords.total }
                : null
          );
          if (onScoreChange) onScoreChange(data.score);
        }
      } catch (error) {
        console.error("Error calculating metrics:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [resume, jobDescription, onScoreChange]);

  if (score === null && !isLoading) {
    return null;
  }

  const scoreDelta =
    score !== null && prevScore !== null && score - prevScore > 0 ? score - prevScore : null;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 60) return "text-yellow-400";
    if (s >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-300">Job Match Strength</div>
        {isLoading && (
          <div className="text-xs text-gray-400 animate-pulse">Calculating...</div>
        )}
      </div>

      {score !== null && (
        <>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                Job Requirement Coverage
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-bold ${getScoreColor(jdCoverage ?? score)}`}>
                  {jdCoverage ?? score}%
                </span>
                {scoreDelta !== null && (
                  <span className="text-sm text-green-300 font-semibold">+{scoreDelta}</span>
                )}
              </div>
            </div>
            {criticalKeywords && criticalKeywords.total > 0 && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  Critical Platform Keywords
                </div>
                <div className={`text-lg font-semibold ${getScoreColor((criticalKeywords.matched / criticalKeywords.total) * 100)}`}>
                  {criticalKeywords.matched} / {criticalKeywords.total}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-400">
            {score >= 80 && "Your resume addresses most job requirements."}
            {score >= 60 && score < 80 && "Good alignment. Consider adding more relevant keywords."}
            {score >= 40 && score < 60 && "Fair match. Your resume needs more optimization."}
            {score < 40 && "Significant improvements needed."}
          </div>
        </>
      )}
    </div>
  );
}
