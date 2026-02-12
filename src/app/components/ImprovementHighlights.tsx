"use client";

import type { ResumeMetricsSnapshot } from "@/app/types/humanize";

interface ImprovementHighlightsProps {
  metrics: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
    matchScore?: number;
  };
  metricsSnapshot?: ResumeMetricsSnapshot | null;
}

export default function ImprovementHighlights({
  metrics,
  metricsSnapshot,
}: ImprovementHighlightsProps) {
  const highlights: Array<{ icon: string; text: string; color: string }> = [];

  if (metricsSnapshot) {
    if (metricsSnapshot.jdCoverage && metricsSnapshot.jdCoverage.total > 0) {
      highlights.push({
        icon: "📋",
        text: `JD coverage: ${metricsSnapshot.jdCoverage.percentage}%`,
        color: "text-green-400",
      });
    }
    if (metricsSnapshot.criticalKeywords && metricsSnapshot.criticalKeywords.total > 0) {
      const kw = metricsSnapshot.criticalKeywords;
      highlights.push({
        icon: "🎯",
        text: `Critical keywords: ${kw.matched}/${kw.total}`,
        color: "text-green-400",
      });
    }
    if (metricsSnapshot.concreteEvidence) {
      highlights.push({
        icon: "📊",
        text: `Bullets with concrete evidence: ${metricsSnapshot.concreteEvidence.percentage}%`,
        color: "text-blue-400",
      });
    }
    if (typeof metricsSnapshot.platformOwnership === "number") {
      highlights.push({
        icon: "🏗️",
        text: `Platform ownership signals: ${metricsSnapshot.platformOwnership}`,
        color: "text-purple-400",
      });
    }
    if (metricsSnapshot.skimSuccess) {
      highlights.push({
        icon: "⚡",
        text: `Skim success: ${metricsSnapshot.skimSuccess.percentage}%`,
        color: "text-yellow-400",
      });
    }
  }

  if (highlights.length === 0 && typeof metrics.matchScore === "number") {
    highlights.push({
      icon: "📈",
      text: `Job Match: ${metrics.matchScore}%`,
      color: "text-green-400",
    });
  }

  if (metrics.quantifiedBulletsAdded && metrics.quantifiedBulletsAdded > 0) {
    highlights.push({
      icon: "📊",
      text: `+${metrics.quantifiedBulletsAdded} bullets with concrete evidence`,
      color: "text-blue-400",
    });
  }

  if (metrics.atsKeywordsMatched && metrics.atsKeywordsMatched > 0) {
    highlights.push({
      icon: "🎯",
      text: `+${metrics.atsKeywordsMatched} critical keywords in context`,
      color: "text-green-400",
    });
  }

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="my-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
      <h3 className="text-lg font-semibold text-white mb-3">Your Resume Improvements</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {highlights.map((highlight, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xl">{highlight.icon}</span>
            <span className={`text-sm ${highlight.color}`}>{highlight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
