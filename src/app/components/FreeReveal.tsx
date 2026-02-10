"use client";

interface FreeRevealProps {
  section: string;
  originalText: string;
  improvedText: string;
}

const MAX_PREVIEW_LENGTH = 1200;

/** Sanitize improvedText - prevent raw JSON or corrupted data from displaying */
function sanitizeImprovedText(text: string): string {
  if (!text || typeof text !== "string") return "";
  // Strip JSON leak (e.g. when LLM output was incorrectly passed through)
  if (text.includes('"improvementMetrics"') || text.includes("improvementMetrics")) {
    text = text.split(/"improvementMetrics"/)[0]?.trim() ?? text.split("improvementMetrics")[0]?.trim() ?? "";
  }
  // Convert literal \n to real newlines for display
  const withNewlines = text.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  if (withNewlines.length > MAX_PREVIEW_LENGTH) {
    return withNewlines.slice(0, MAX_PREVIEW_LENGTH).trim() + "\n\n...";
  }
  return withNewlines.trim();
}

export default function FreeReveal({ section, originalText, improvedText }: FreeRevealProps) {
  const displayImproved = sanitizeImprovedText(improvedText);
  const displayOriginal = typeof originalText === "string" ? originalText.trim() : "";

  return (
    <div className="relative my-6 p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
      <div className="absolute top-2 right-2">
        <span className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full">
          Preview
        </span>
      </div>
      
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-300 mb-1">{section}</h4>
        <p className="text-xs text-gray-400 mb-3">This section is unlocked to show you the quality of improvements</p>
      </div>
      
      {displayOriginal && (
        <div className="mb-3 p-3 rounded bg-gray-800/50 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Before:</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{displayOriginal}</p>
        </div>
      )}
      
      <div className="p-3 rounded bg-green-500/10 border border-green-500/30">
        <p className="text-xs text-green-400 mb-1">After (AI-optimized):</p>
        <p className="text-sm text-white font-medium whitespace-pre-wrap">{displayImproved}</p>
      </div>
    </div>
  );
}





