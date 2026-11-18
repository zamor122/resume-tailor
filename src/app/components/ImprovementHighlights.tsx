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
    <div className="my-6 p-4 rounded-xl neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] text-[#1C2028]">
      <div className="flex items-center gap-2 mb-3">
        <span className="neo-tag bg-[#10B981] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase">
          METRIC GAINS
        </span>
        <h3 className="text-sm font-mono font-bold text-[#1C2028]">RESUME ENHANCEMENTS</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {highlights.map((highlight, index) => (
          <div key={index} className="neo-box-sm bg-white border border-[#1C2028] p-2.5 rounded-lg flex items-center gap-2 shadow-[2px_2px_0px_#1C2028]">
            <span className="text-lg">{highlight.icon}</span>
            <span className="text-xs font-mono font-bold text-[#1C2028]">{highlight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
