"use client";

import { useState } from "react";

interface ControlPanelProps {
  onViewChange?: (view: string) => void;
  onSettingsChange?: (settings: any) => void;
}

export default function ControlPanel({ onViewChange, onSettingsChange }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    showAIDetection: true,
    showRelevancyScore: true,
    showComparison: true,
    showChat: true,
    theme: "dark",
    fontSize: "medium",
    layout: "grid",
  });

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full glass-strong 
                   flex items-center justify-center shadow-lg hover:scale-110 transition-transform
                   border border-white/20"
      >
        <svg
          className={`w-6 h-6 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 glass-strong rounded-2xl p-6 
                      border border-white/20 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold gradient-text-cyber">Control Panel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* View Controls */}
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Views</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showChat}
                    onChange={(e) => handleSettingChange("showChat", e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-400">Chat Interface</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showComparison}
                    onChange={(e) => handleSettingChange("showComparison", e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-400">Comparison View</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showAIDetection}
                    onChange={(e) => handleSettingChange("showAIDetection", e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-400">AI Detection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showRelevancyScore}
                    onChange={(e) => handleSettingChange("showRelevancyScore", e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-400">Relevancy Score</span>
                </label>
              </div>
            </div>

            {/* Layout */}
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Layout</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSettingChange("layout", "grid")}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    settings.layout === "grid"
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => handleSettingChange("layout", "split")}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    settings.layout === "split"
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  Split
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Font Size</label>
              <div className="grid grid-cols-3 gap-2">
                {["small", "medium", "large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSettingChange("fontSize", size)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all capitalize ${
                      settings.fontSize === size
                        ? "bg-primary/20 text-primary border border-primary/50"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-white/10">
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Quick Actions</label>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 rounded-lg bg-primary/20 text-primary 
                                 hover:bg-primary/30 transition-colors text-sm font-semibold">
                  Export Resume
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-secondary/20 text-secondary 
                                 hover:bg-secondary/30 transition-colors text-sm font-semibold">
                  Share Comparison
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-accent/20 text-accent 
                                 hover:bg-accent/30 transition-colors text-sm font-semibold">
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

