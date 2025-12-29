"use client";

import { useState, useEffect } from "react";
import DiffMatchPatch from "diff-match-patch";
import { analytics } from "../services/analytics";

interface ComparisonViewProps {
  original: string;
  tailored: string;
  viewMode?: "split" | "unified" | "diff";
  showLineNumbers?: boolean;
  fontSize?: "small" | "medium" | "large";
}

// Utility function to map fontSize to Tailwind classes
const getFontSizeClass = (fontSize: "small" | "medium" | "large" = "medium") => {
  switch (fontSize) {
    case "small":
      return "text-xs";
    case "medium":
      return "text-sm";
    case "large":
      return "text-base";
    default:
      return "text-sm";
  }
};

export default function ComparisonView({
  original,
  tailored,
  viewMode = "split",
  showLineNumbers = true,
  fontSize = "medium",
}: ComparisonViewProps) {
  const fontSizeClass = getFontSizeClass(fontSize);
  const [mode, setMode] = useState<"split" | "unified" | "diff">(viewMode);
  
  // Sync internal state with prop changes
  useEffect(() => {
    setMode(viewMode);
  }, [viewMode]);
  
  // Track comparison view opened
  useEffect(() => {
    if (original && tailored) {
      analytics.trackEvent(analytics.events.COMPARISON_VIEW_OPENED, {
        timestamp: new Date().toISOString(),
      });
    }
  }, [original, tailored]);
  
  // Track mode changes
  const handleModeChange = (newMode: "split" | "unified" | "diff") => {
    setMode(newMode);
    analytics.trackEvent(analytics.events.COMPARISON_VIEW_MODE_CHANGED, {
      mode: newMode,
      timestamp: new Date().toISOString(),
    });
  };

  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(original, tailored);
  dmp.diff_cleanupSemantic(diffs);
  
  // Calculate similarity
  const similarity = 1 - (dmp.diff_levenshtein(diffs) / Math.max(original.length, tailored.length));

  // Character-level diff (for unified view)
  const renderUnifiedDiff = () => {
    return diffs.map((diff, index) => {
      const [operation, text] = diff;
      const lines = text.split("\n");
      
      return lines.map((line, lineIndex) => {
        if (lineIndex === lines.length - 1 && line === "") return null;
        
        let bgColor = "";
        let textColor = "";
        let borderColor = "";
        
        if (operation === 1) {
          // Insertion (green)
          bgColor = "bg-green-500/10";
          textColor = "text-green-400";
          borderColor = "border-l-green-500";
        } else if (operation === -1) {
          // Deletion (red)
          bgColor = "bg-red-500/10";
          textColor = "text-red-400";
          borderColor = "border-l-red-500";
        } else {
          // Equal (default) - show context but dimmed
          bgColor = "bg-transparent";
          textColor = "text-gray-500";
          borderColor = "border-l-transparent";
        }
        
        return (
          <div
            key={`${index}-${lineIndex}`}
            className={`${bgColor} ${textColor} ${borderColor} border-l-2 pl-3 py-0.5 font-mono ${fontSizeClass}`}
          >
            {operation === -1 ? "- " : operation === 1 ? "+ " : "  "}
            {line || " "}
          </div>
        );
      });
    });
  };

  // Side-by-side diff view with highlighted changes
  const renderSideBySideDiff = () => {
    const originalLines = original.split("\n");
    const tailoredLines = tailored.split("\n");
    
    // Create line-by-line diff by comparing line arrays
    const lineDiffs = dmp.diff_main(
      originalLines.join("\n"),
      tailoredLines.join("\n")
    );
    dmp.diff_cleanupSemantic(lineDiffs);
    
    // Process diffs to create side-by-side view
    let originalLineNum = 1;
    let tailoredLineNum = 1;
    const result: React.ReactElement[] = [];
    
    lineDiffs.forEach((diff, index) => {
      const [operation, text] = diff;
      const lines = text.split("\n").filter((line, idx, arr) => {
        if (idx === arr.length - 1 && line === "" && index === lineDiffs.length - 1) {
          return false;
        }
        return true;
      });
      
      if (operation === 0) {
        // Unchanged lines - show both sides
        lines.forEach((line) => {
          if (line === "") return;
          result.push(
            <div key={`equal-${index}-${originalLineNum}`} className="grid grid-cols-2 gap-4 py-0.5">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-mono text-xs w-8 text-right flex-shrink-0">
                  {originalLineNum}
                </span>
                <pre className={`${fontSizeClass} font-mono text-gray-300 whitespace-pre-wrap flex-1`}>
                  {line}
                </pre>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-mono text-xs w-8 text-right flex-shrink-0">
                  {tailoredLineNum}
                </span>
                <pre className={`${fontSizeClass} font-mono text-gray-300 whitespace-pre-wrap flex-1`}>
                  {line}
                </pre>
              </div>
            </div>
          );
          originalLineNum++;
          tailoredLineNum++;
        });
      } else if (operation === -1) {
        // Deleted lines - show in original, blank in tailored
        lines.forEach((line) => {
          if (line === "") return;
          result.push(
            <div key={`del-${index}-${originalLineNum}`} className="grid grid-cols-2 gap-4 py-0.5">
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-mono text-xs w-8 text-right flex-shrink-0">
                  {originalLineNum}
                </span>
                <pre className={`${fontSizeClass} font-mono bg-red-500/10 text-red-400 border-l-2 border-l-red-500 pl-3 py-1 whitespace-pre-wrap flex-1`}>
                  {line}
                </pre>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-mono text-xs w-8 text-right flex-shrink-0">
                  -
                </span>
                <pre className={`${fontSizeClass} font-mono text-gray-500 whitespace-pre-wrap flex-1`}>
                  {" "}
                </pre>
              </div>
            </div>
          );
          originalLineNum++;
        });
      } else if (operation === 1) {
        // Added lines - blank in original, show in tailored
        lines.forEach((line) => {
          if (line === "") return;
          result.push(
            <div key={`add-${index}-${tailoredLineNum}`} className="grid grid-cols-2 gap-4 py-0.5">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-mono text-xs w-8 text-right flex-shrink-0">
                  -
                </span>
                <pre className={`${fontSizeClass} font-mono text-gray-500 whitespace-pre-wrap flex-1`}>
                  {" "}
                </pre>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-mono text-xs w-8 text-right flex-shrink-0">
                  {tailoredLineNum}
                </span>
                <pre className={`${fontSizeClass} font-mono bg-green-500/10 text-green-400 border-l-2 border-l-green-500 pl-3 py-1 whitespace-pre-wrap flex-1`}>
                  {line}
                </pre>
              </div>
            </div>
          );
          tailoredLineNum++;
        });
      }
    });
    
    return result;
  };

  return (
    <div className="comparison-panel h-full flex flex-col">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleModeChange("split")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "split"
                ? "bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            Split View
          </button>
                 <button
                   onClick={() => handleModeChange("unified")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "unified"
                ? "bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            Unified Diff
          </button>
                 <button
                   onClick={() => handleModeChange("diff")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "diff"
                ? "bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            Side-by-Side Diff
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500/50"></div>
            <span>Added</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/50"></div>
            <span>Removed</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === "split" && (
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-sm font-semibold text-red-400">Original Resume</h3>
                <span className="text-xs text-gray-400">{original.length} chars</span>
              </div>
              <div className="flex-1 overflow-y-auto glass rounded-lg p-4">
                <pre className={`${fontSizeClass} font-mono text-gray-300 whitespace-pre-wrap leading-relaxed`}>
                  {original}
                </pre>
              </div>
            </div>
            
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-sm font-semibold text-green-400">Tailored Resume</h3>
                <span className="text-xs text-gray-400">{tailored.length} chars</span>
              </div>
              <div className="flex-1 overflow-y-auto glass rounded-lg p-4">
                <pre className={`${fontSizeClass} font-mono text-gray-300 whitespace-pre-wrap leading-relaxed`}>
                  {tailored}
                </pre>
              </div>
            </div>
          </div>
        )}

        {mode === "unified" && (
          <div className="h-full overflow-y-auto glass rounded-lg p-4">
            <div className={`font-mono ${fontSizeClass} leading-relaxed space-y-0`}>
              {renderUnifiedDiff()}
            </div>
          </div>
        )}

        {mode === "diff" && (
          <div className="h-full overflow-y-auto glass rounded-lg p-4">
            <div className={`font-mono ${fontSizeClass} leading-relaxed`}>
              <div className="grid grid-cols-2 gap-4 mb-2 pb-2 border-b border-white/10 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-right">Line</span>
                  <span>Original Resume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 text-right">Line</span>
                  <span>Tailored Resume</span>
                </div>
              </div>
              <div className="space-y-0">
                {renderSideBySideDiff()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-400">Changes: </span>
            <span className="text-primary font-semibold">
              {diffs.filter(([op]) => op !== 0).length}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Similarity: </span>
            <span className="text-green-400 font-semibold">
              {Math.round(similarity * 100)}%
            </span>
          </div>
        </div>
        <button 
          onClick={() => {
            const comparison = {
              original,
              tailored,
              changes: diffs.filter(([op]) => op !== 0).length,
              similarity: Math.round(similarity * 100),
              timestamp: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(comparison, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume-comparison-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="text-primary hover:text-primary-light transition-colors flex items-center gap-1 hover:gap-2"
        >
          Export Comparison →
        </button>
      </div>
    </div>
  );
}

