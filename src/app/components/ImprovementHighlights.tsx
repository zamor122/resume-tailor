"use client";

import type { ResumeMetricsSnapshot } from "@/app/types/humanize";

interface ImprovementHighlightsProps {
  metrics: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
    matchScore?: { before: number; after: number };
  };
  beforeMetrics?: ResumeMetricsSnapshot | null;
  afterMetrics?: ResumeMetricsSnapshot | null;
}

export default function ImprovementHighlights({
  metrics,
  beforeMetrics,
  afterMetrics,
}: ImprovementHighlightsProps) {
  const highlights: Array<{ icon: string; text: string; color: string }> = [];

  if (beforeMetrics && afterMetrics) {
    if (beforeMetrics.jdCoverage && afterMetrics.jdCoverage && afterMetrics.jdCoverage.total > 0) {
      const beforePct = beforeMetrics.jdCoverage.percentage;
      const afterPct = afterMetrics.jdCoverage.percentage;
      const delta = afterPct - beforePct;
      highlights.push({
        icon: "📋",
        text: `JD coverage: ${beforePct}% → ${afterPct}%${delta > 0 ? ` (+${delta}%)` : ""}`,
        color: "text-green-400",
      });
    }
    if (
      beforeMetrics.criticalKeywords &&
      afterMetrics.criticalKeywords &&
      afterMetrics.criticalKeywords.total > 0
    ) {
      const before = beforeMetrics.criticalKeywords;
      const after = afterMetrics.criticalKeywords;
      highlights.push({
        icon: "🎯",
        text: `Critical keywords: ${before.matched}/${before.total} → ${after.matched}/${after.total}`,
        color: "text-green-400",
      });
    }
    if (beforeMetrics.concreteEvidence && afterMetrics.concreteEvidence) {
      const beforePct = beforeMetrics.concreteEvidence.percentage;
      const afterPct = afterMetrics.concreteEvidence.percentage;
      if (afterPct > beforePct) {
        highlights.push({
          icon: "📊",
          text: `Bullets with concrete evidence: ${beforePct}% → ${afterPct}%`,
          color: "text-blue-400",
        });
      }
    }
    if (
      typeof beforeMetrics.platformOwnership === "number" &&
      typeof afterMetrics.platformOwnership === "number" &&
      afterMetrics.platformOwnership > beforeMetrics.platformOwnership
    ) {
      highlights.push({
        icon: "🏗️",
        text: `Platform ownership signals: ${beforeMetrics.platformOwnership} → ${afterMetrics.platformOwnership}`,
        color: "text-purple-400",
      });
    }
    if (beforeMetrics.skimSuccess && afterMetrics.skimSuccess) {
      const beforePct = beforeMetrics.skimSuccess.percentage;
      const afterPct = afterMetrics.skimSuccess.percentage;
      if (afterPct > beforePct) {
        highlights.push({
          icon: "⚡",
          text: `Skim success: ${beforePct}% → ${afterPct}%`,
          color: "text-yellow-400",
        });
      }
    }
  }

  if (highlights.length === 0 && metrics.matchScore) {
    const improvement = metrics.matchScore.after - metrics.matchScore.before;
    highlights.push({
      icon: "📈",
      text: `Match score: ${metrics.matchScore.before}% → ${metrics.matchScore.after}%${improvement > 0 ? ` (+${improvement}%)` : ""}`,
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
