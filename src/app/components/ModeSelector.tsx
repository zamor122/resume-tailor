"use client";

export type TailorMode = "quick" | "pipeline";

interface ModeSelectorProps {
  value: TailorMode;
  onChange: (mode: TailorMode) => void;
}

const MODES: { id: TailorMode; label: string; description: string }[] = [
  { id: "quick", label: "Quick Tailor", description: "Single tailor action" },
  { id: "pipeline", label: "Smart Pipeline", description: "Preset multi-step workflows" },
];

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Choose how to tailor your resume"
      className="flex rounded-t-xl border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden"
    >
      {MODES.map((mode) => {
        const isSelected = value === mode.id;
        return (
          <button
            key={mode.id}
            role="tab"
            id={`mode-tab-${mode.id}`}
            aria-selected={isSelected}
            aria-controls={`mode-panel-${mode.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(mode.id)}
            className={`
              flex-1 min-w-0 px-4 py-3.5 text-sm font-medium transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2
              ${
                isSelected
                  ? "bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 dark:border-cyan-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }
            `}
          >
            <span className="block truncate">{mode.label}</span>
            <span
              className={`block text-xs mt-0.5 truncate ${
                isSelected ? "text-cyan-500/90 dark:text-cyan-400/90" : "text-gray-500 dark:text-gray-500"
              }`}
            >
              {mode.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
