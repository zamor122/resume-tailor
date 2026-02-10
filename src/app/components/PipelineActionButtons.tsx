"use client";

import { INTENT_PIPELINES, type PipelineId } from "@/app/config/pipelines";

interface PipelineActionButtonsProps {
  resume: string;
  jobDescription: string;
  loadingPipelineId: PipelineId | null;
  onRunPipeline: (pipelineId: PipelineId) => void;
}

export default function PipelineActionButtons({
  resume,
  jobDescription,
  loadingPipelineId,
  onRunPipeline,
}: PipelineActionButtonsProps) {
  const resumeReady = resume.trim().length >= 100;
  const jobReady = jobDescription.trim().length >= 100;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Choose a pipeline
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(INTENT_PIPELINES) as PipelineId[]).map((pipelineId) => {
          const config = INTENT_PIPELINES[pipelineId];
          const needsResume = config.requiresResume;
          const needsJob = config.requiresJobDescription;
          const canRun =
            (!needsResume || resumeReady) && (!needsJob || jobReady);
          const isLoading = loadingPipelineId === pipelineId;

          const missingRequirements: string[] = [];
          if (needsResume && !resumeReady) missingRequirements.push("Resume (min 100 chars)");
          if (needsJob && !jobReady) missingRequirements.push("Job Description (min 100 chars)");

          return (
            <button
              key={pipelineId}
              type="button"
              onClick={() => canRun && !isLoading && onRunPipeline(pipelineId)}
              disabled={!canRun || isLoading}
              title={
                !canRun
                  ? `Requires: ${missingRequirements.join(", ")}`
                  : undefined
              }
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  !canRun || isLoading
                    ? "border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed"
                    : "border-gray-300 dark:border-gray-600 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-[0_0_12px_rgba(0,240,255,0.15)] cursor-pointer"
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {config.name}
                    </h4>
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {config.description}
                  </p>
                  {!canRun && missingRequirements.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Requires: {missingRequirements.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
