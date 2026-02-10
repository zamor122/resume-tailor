"use client";

export type StepStatus = "pending" | "active" | "complete" | "error";

export interface PipelineStepStatus {
  id: string;
  label: string;
  status: StepStatus;
}

interface PipelineProgressProps {
  steps: PipelineStepStatus[];
  currentMessage?: string;
}

export default function PipelineProgress({ steps, currentMessage }: PipelineProgressProps) {
  if (steps.length === 0) return null;

  return (
    <div className="input-container w-full max-w-2xl mx-auto p-6 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent animate-pulse"
        aria-hidden
      />
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = step.status === "active";
          const isCompleted = step.status === "complete";
          const isError = step.status === "error";

          return (
            <div key={step.id} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : isError ? (
                  <div className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-500 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm transition-colors duration-200 ${
                    isCompleted
                      ? "text-cyan-400 dark:text-cyan-400"
                      : isError
                        ? "text-red-400 dark:text-red-400"
                        : isActive
                          ? "text-cyan-500 dark:text-cyan-400 font-medium"
                          : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentMessage && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-cyan-500 dark:text-cyan-400 font-medium">
              {currentMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
