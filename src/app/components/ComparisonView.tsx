"use client";

import { useState, useEffect } from "react";
import DiffMatchPatch from "diff-match-patch";

interface ComparisonViewProps {
  original: string;
  tailored: string;
  viewMode?: "split" | "unified" | "diff";
  showLineNumbers?: boolean;
}

export default function ComparisonView({
  original,
  tailored,
  viewMode = "split",
  showLineNumbers = true,
}: ComparisonViewProps) {
  const [mode, setMode] = useState<"split" | "unified" | "diff">(viewMode);
  
  // Sync internal state with prop changes
  useEffect(() => {
    setMode(viewMode);
  }, [viewMode]);

  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(original, tailored);
  dmp.diff_cleanupSemantic(diffs);
  
  // Calculate similarity
  const similarity = 1 - (dmp.diff_levenshtein(diffs) / Math.max(original.length, tailored.length));

  const renderDiff = () => {
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
          // Equal (default)
          bgColor = "bg-transparent";
          textColor = "text-gray-300";
          borderColor = "border-l-transparent";
        }
        
        return (
          <div
            key={`${index}-${lineIndex}`}
            className={`${bgColor} ${textColor} ${borderColor} border-l-2 pl-3 py-1 font-mono text-sm`}
          >
            {operation === -1 ? "- " : operation === 1 ? "+ " : "  "}
            {line || " "}
          </div>
        );
      });
    });
  };

  return (
    <div className="comparison-panel h-full flex flex-col">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("split")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "split"
                ? "bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setMode("unified")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "unified"
                ? "bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            Unified Diff
          </button>
          <button
            onClick={() => setMode("diff")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "diff"
                ? "bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            Line Diff
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
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
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
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {tailored}
                </pre>
              </div>
            </div>
          </div>
        )}

        {mode === "unified" && (
          <div className="h-full overflow-y-auto glass rounded-lg p-4">
            <div className="font-mono text-xs leading-relaxed">
              {renderDiff()}
            </div>
          </div>
        )}

        {mode === "diff" && (
          <div className="h-full overflow-y-auto glass rounded-lg p-4">
            <div className="font-mono text-xs leading-relaxed">
              {renderDiff()}
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

