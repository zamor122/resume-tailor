"use client";

import { useState, useEffect } from "react";
import { analytics } from "../services/analytics";

interface DiffChange {
  type: "added" | "modified" | "removed";
  original: string;
  tailored: string;
  explanation?: string;
  jobReason?: string;
  section?: string;
  position?: {
    start: number;
    end: number;
  };
}

interface DiffSection {
  name: string;
  changes: DiffChange[];
}

interface DiffData {
  sections: DiffSection[];
  summary: {
    totalChanges: number;
    additions: number;
    modifications: number;
    removals: number;
  };
}

interface DiffViewerProps {
  originalResume: string;
  tailoredResume: string;
  jobDescription?: string;
  diffData?: DiffData;
  isUnlocked?: boolean;
  onUnlock?: () => void;
  onFeedback?: (changeIndex: number, sectionName: string, helpful: boolean, feedback?: string) => void;
}

export default function DiffViewer({
  originalResume,
  tailoredResume,
  jobDescription,
  diffData,
  isUnlocked = false,
  onUnlock,
  onFeedback,
}: DiffViewerProps) {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [feedbackStates, setFeedbackStates] = useState<Map<string, { helpful?: boolean; feedback?: string }>>(new Map());
  const [localDiffData, setLocalDiffData] = useState<DiffData | null>(diffData || null);
  const [isLoading, setIsLoading] = useState(!diffData);

  // Fetch diff data if not provided (but don't generate explanations automatically to avoid rate limits)
  useEffect(() => {
    if (!diffData && originalResume && tailoredResume) {
      setIsLoading(true);
      fetch("/api/humanize/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalResume,
          tailoredResume,
          jobDescription,
          generateExplanations: false, // Don't generate explanations automatically - user can request them
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.sections) {
            setLocalDiffData(data);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching diff data:", error);
          setIsLoading(false);
        });
    }
  }, [originalResume, tailoredResume, jobDescription, diffData]);

  const toggleExplanation = (sectionName: string, changeIndex: number) => {
    const key = `${sectionName}-${changeIndex}`;
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFeedback = (
    sectionName: string,
    changeIndex: number,
    helpful: boolean
  ) => {
    const key = `${sectionName}-${changeIndex}`;
    setFeedbackStates((prev) => {
      const next = new Map(prev);
      next.set(key, { ...next.get(key), helpful });
      return next;
    });

    if (onFeedback) {
      const change = localDiffData?.sections
        .find((s) => s.name === sectionName)
        ?.changes[changeIndex];
      if (change) {
        onFeedback(changeIndex, sectionName, helpful);
      }
    }

    // Track analytics
    analytics.trackEvent("explanation_feedback", {
      helpful,
      section: sectionName,
      changeIndex,
    });
  };

  const handleFeedbackText = (
    sectionName: string,
    changeIndex: number,
    feedback: string
  ) => {
    const key = `${sectionName}-${changeIndex}`;
    setFeedbackStates((prev) => {
      const next = new Map(prev);
      next.set(key, { ...next.get(key), feedback });
      return next;
    });

    if (onFeedback) {
      onFeedback(changeIndex, sectionName, true, feedback);
    }
  };

  /**
   * Filter to show only significant changes in free preview
   */
  function isSignificantChange(change: DiffChange): boolean {
    if (change.type === "added") {
      return change.tailored.length > 20; // Substantial additions
    }
    if (change.type === "modified") {
      if (change.original.length === 0) return true; // New content
      const changeRatio = Math.abs(change.tailored.length - change.original.length) / change.original.length;
      return changeRatio > 0.3 || change.tailored.length > 30; // 30%+ change or substantial new content
    }
    if (change.type === "removed") {
      return change.original.length > 15; // Only show removals of substantial content
    }
    return false;
  }

  // Filter changes if not unlocked (free preview)
  const filteredDiffData = isUnlocked 
    ? localDiffData 
    : localDiffData 
      ? {
          ...localDiffData,
          sections: localDiffData.sections.map(section => ({
            ...section,
            changes: section.changes.filter(isSignificantChange),
          })),
          summary: {
            ...localDiffData.summary,
            // Recalculate summary based on filtered changes
            totalChanges: localDiffData.sections.reduce((sum, s) => sum + s.changes.filter(isSignificantChange).length, 0),
            additions: localDiffData.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === "added" && isSignificantChange(c)).length, 0),
            modifications: localDiffData.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === "modified" && isSignificantChange(c)).length, 0),
            removals: localDiffData.sections.reduce((sum, s) => sum + s.changes.filter(c => c.type === "removed" && isSignificantChange(c)).length, 0),
          },
        }
      : null;

  // Calculate total vs filtered counts
  const totalChanges = localDiffData?.summary.totalChanges ?? 0;
  const filteredChanges = filteredDiffData?.summary.totalChanges ?? 0;
  const hiddenChanges = totalChanges - filteredChanges;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-400">Analyzing changes...</div>
      </div>
    );
  }

  if (!localDiffData) {
    return (
      <div className="text-red-400 p-4">Error loading diff data</div>
    );
  }

  if (!filteredDiffData) {
    return (
      <div className="text-red-400 p-4">Error processing diff data</div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">What Changed and Why</h2>
        <p className="text-gray-400">
          See exactly how your resume was optimized for this job
        </p>
        {!isUnlocked && hiddenChanges > 0 && (
          <p className="text-sm text-yellow-400 mt-2">
            Showing {filteredChanges} of {totalChanges} changes. {hiddenChanges} more available after purchase.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">Summary of Changes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-900/50 rounded-lg">
            <div className="text-3xl font-bold text-white">{filteredDiffData.summary.totalChanges}</div>
            <div className="text-sm text-gray-400 mt-1">
              {isUnlocked ? "Total Changes" : `Showing ${filteredChanges} of ${totalChanges}`}
            </div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <div className="text-3xl font-bold text-green-400">{filteredDiffData.summary.additions}</div>
            <div className="text-sm text-gray-400 mt-1">Additions</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <div className="text-3xl font-bold text-yellow-400">{filteredDiffData.summary.modifications}</div>
            <div className="text-sm text-gray-400 mt-1">Modifications</div>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="text-3xl font-bold text-red-400">{filteredDiffData.summary.removals}</div>
            <div className="text-sm text-gray-400 mt-1">Removals</div>
          </div>
        </div>
      </div>

      {/* Side-by-side diff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original Resume */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Original Resume
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredDiffData.sections.map((section) =>
              section.changes.map((change, changeIndex) => {
                if (change.type === "removed" || change.type === "modified") {
                  return (
                    <div
                      key={`${section.name}-${changeIndex}`}
                      className="p-3 rounded bg-red-500/10 border border-red-500/30"
                    >
                      <div className="text-red-400 line-through">{change.original}</div>
                    </div>
                  );
                }
                return null;
              })
            )}
            {/* Show unchanged content */}
            <div className="text-gray-400 text-sm whitespace-pre-wrap">
              {originalResume.split("\n").slice(0, 10).join("\n")}
              {originalResume.split("\n").length > 10 && "..."}
            </div>
          </div>
        </div>

        {/* Tailored Resume */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Tailored Resume
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredDiffData.sections.map((section) =>
              section.changes.map((change, changeIndex) => {
                if (change.type === "added" || change.type === "modified") {
                  const key = `${section.name}-${changeIndex}`;
                  const isExpanded = expandedExplanations.has(key);
                  const feedback = feedbackStates.get(key);

                  return (
                    <div
                      key={key}
                      className="p-3 rounded bg-green-500/10 border border-green-500/30"
                    >
                      <div className="text-green-400 font-medium">{change.tailored}</div>
                      
                      {/* Explanation - Always visible */}
                      {change.explanation && (
                        <div className="mt-3 p-3 bg-blue-500/10 rounded border border-blue-500/30">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-blue-400 font-semibold text-xs">Why this change?</span>
                          </div>
                          <p className="text-sm text-gray-300">{change.explanation}</p>
                          {change.jobReason && (
                            <p className="text-xs text-gray-400 mt-2">
                              <strong className="text-white">Job relevance:</strong> {change.jobReason}
                            </p>
                          )}
                          
                          {/* Feedback */}
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => handleFeedback(section.name, changeIndex, true)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                feedback?.helpful === true
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                            >
                              👍 Helpful
                            </button>
                            <button
                              onClick={() => handleFeedback(section.name, changeIndex, false)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                feedback?.helpful === false
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                            >
                              👎 Not accurate
                            </button>
                          </div>
                          
                          {/* Feedback textbox */}
                          {feedback?.helpful === false && (
                            <textarea
                              placeholder="Tell us what's inaccurate..."
                              value={feedback.feedback || ""}
                              onChange={(e) =>
                                handleFeedbackText(section.name, changeIndex, e.target.value)
                              }
                              className="mt-2 w-full p-2 text-xs bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                              rows={2}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })
            )}
            {/* Show unchanged content */}
            <div className="text-gray-400 text-sm whitespace-pre-wrap">
              {tailoredResume.split("\n").slice(0, 10).join("\n")}
              {tailoredResume.split("\n").length > 10 && "..."}
            </div>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Changes by Section</h3>
        {filteredDiffData.sections.map((section) => (
          <div
            key={section.name}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
          >
            <h4 className="text-md font-semibold text-white mb-3">
              {section.name} ({section.changes.length} changes)
            </h4>
            <div className="space-y-3">
              {section.changes.map((change, changeIndex) => {
                const key = `${section.name}-${changeIndex}`;
                const isExpanded = expandedExplanations.has(key);
                const feedback = feedbackStates.get(key);

                return (
                  <div
                    key={key}
                    className={`p-3 rounded border ${
                      change.type === "added"
                        ? "bg-green-500/10 border-green-500/30"
                        : change.type === "modified"
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {change.type === "removed" && (
                          <div className="text-red-400 line-through">{change.original}</div>
                        )}
                        {change.type === "added" && (
                          <div className="text-green-400">{change.tailored}</div>
                        )}
                        {change.type === "modified" && (
                          <div>
                            <div className="text-red-400 line-through text-sm">
                              {change.original}
                            </div>
                            <div className="text-green-400 mt-1">{change.tailored}</div>
                          </div>
                        )}
                      </div>
                      <span
                        className={`ml-2 px-2 py-1 text-xs rounded ${
                          change.type === "added"
                            ? "bg-green-500/20 text-green-400"
                            : change.type === "modified"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {change.type}
                      </span>
                    </div>

                    {/* Explanation - Always visible */}
                    {change.explanation && (
                      <div className="mt-3 p-3 bg-blue-500/10 rounded border border-blue-500/30">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-blue-400 font-semibold text-xs">Why this change?</span>
                        </div>
                        <p className="text-sm text-gray-300">{change.explanation}</p>
                        {change.jobReason && (
                          <p className="text-xs text-gray-400 mt-2">
                            <strong className="text-white">Job relevance:</strong> {change.jobReason}
                          </p>
                        )}

                        {/* Feedback */}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(section.name, changeIndex, true)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              feedback?.helpful === true
                                ? "bg-green-500 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            👍 Helpful
                          </button>
                          <button
                            onClick={() => handleFeedback(section.name, changeIndex, false)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              feedback?.helpful === false
                                ? "bg-red-500 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            👎 Not accurate
                          </button>
                        </div>

                        {/* Feedback textbox */}
                        {feedback?.helpful === false && (
                          <textarea
                            placeholder="Tell us what's inaccurate..."
                            value={feedback.feedback || ""}
                            onChange={(e) =>
                              handleFeedbackText(section.name, changeIndex, e.target.value)
                            }
                            className="mt-2 w-full p-2 text-xs bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
                            rows={2}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* CTA to View Full Resume */}
      {!isUnlocked && onUnlock && (
        <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Ready to see your complete tailored resume?
          </h3>
          <p className="text-gray-300 mb-2">
            Purchase time-based access to unlock all resumes with full optimizations and downloads
          </p>
          {hiddenChanges > 0 && (
            <p className="text-sm text-yellow-400 mb-4">
              Plus see {hiddenChanges} additional change{hiddenChanges !== 1 ? 's' : ''} not shown in preview
            </p>
          )}
          <button
            onClick={onUnlock}
            className="px-8 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Choose Access Plan
          </button>
        </div>
      )}
    </div>
  );
}

