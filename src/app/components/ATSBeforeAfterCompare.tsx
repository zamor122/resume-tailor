"use client";

import { useState, useEffect } from "react";

interface ATSBeforeAfterCompareProps {
  originalResume: string;
  tailoredResume: string;
  loading?: boolean;
}

interface ATSSimulatorResponse {
  atsScore: number;
  parsingAccuracy?: number;
  issues?: string[];
  recommendations?: string[];
}

export default function ATSBeforeAfterCompare({
  originalResume,
  tailoredResume,
  loading = false,
}: ATSBeforeAfterCompareProps) {
  const [before, setBefore] = useState<ATSSimulatorResponse | null>(null);
  const [after, setAfter] = useState<ATSSimulatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!originalResume || !tailoredResume || originalResume.length < 100) return;

    const fetchScores = async () => {
      setError(null);
      try {
        const [beforeRes, afterRes] = await Promise.all([
          fetch("/api/tools/ats-simulator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume: originalResume, source: "before" }),
          }),
          fetch("/api/tools/ats-simulator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume: tailoredResume, source: "after" }),
          }),
        ]);

        if (!beforeRes.ok || !afterRes.ok) {
          throw new Error("Failed to get ATS scores");
        }

        const beforeData = await beforeRes.json();
        const afterData = await afterRes.json();

        const toIssueStrings = (items: unknown[]): string[] =>
          items.map((item) =>
            typeof item === "string" ? item : (item as { description?: string })?.description ?? String(item)
          );
        const toRecStrings = (items: unknown[]): string[] =>
          items.map((item) =>
            typeof item === "string" ? item : (item as { action?: string })?.action ?? String(item)
          );

        setBefore({
          atsScore: beforeData.atsScore ?? 0,
          parsingAccuracy: beforeData.parsingAccuracy ?? beforeData.atsScore ?? 0,
          issues: toIssueStrings(beforeData.issues ?? []),
          recommendations: toRecStrings(beforeData.recommendations ?? []),
        });
        setAfter({
          atsScore: afterData.atsScore ?? 0,
          parsingAccuracy: afterData.parsingAccuracy ?? afterData.atsScore ?? 0,
          issues: toIssueStrings(afterData.issues ?? []),
          recommendations: toRecStrings(afterData.recommendations ?? []),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not compare ATS scores");
      }
    };

    fetchScores();
  }, [originalResume, tailoredResume]);

  if (loading || (!before && !after && !error)) {
    return (
      <div className="output-container p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          How ATS Systems Read Your Resume
        </h3>
        <div className="flex gap-4 animate-pulse">
          <div className="flex-1 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="output-container p-4">
        <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
      </div>
    );
  }

  const beforeScore = before?.parsingAccuracy ?? before?.atsScore ?? 0;
  const afterScore = after?.parsingAccuracy ?? after?.atsScore ?? 0;
  const delta = afterScore - beforeScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="output-container p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        See how your changes affect how ATS systems read your resume
      </h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Before</p>
          <div className={`text-3xl font-bold ${getScoreColor(beforeScore)}`}>
            {beforeScore}%
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">ATS parse score</p>
          {before?.issues && before.issues.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Issues found:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                {before.issues.slice(0, 2).map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">After</p>
          <div className={`text-3xl font-bold ${getScoreColor(afterScore)}`}>
            {afterScore}%
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">ATS parse score</p>
          {delta > 0 && (
            <p className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
              +{delta} points
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
