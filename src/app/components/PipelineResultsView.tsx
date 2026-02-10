"use client";

import { INTENT_PIPELINES, type PipelineId } from "@/app/config/pipelines";
import InterviewPrepView from "@/app/components/InterviewPrepView";

interface PipelineResultsViewProps {
  pipelineId: PipelineId;
  results: Record<string, unknown>;
}

function formatResult(_key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.atsScore !== undefined) {
      return (
        <span>
          ATS Score: <strong>{String(obj.atsScore)}%</strong>
        </span>
      );
    }
    if (obj.matchScore !== undefined) {
      return (
        <span>
          Match: <strong>{String(obj.matchScore)}%</strong>
        </span>
      );
    }
    if (obj.atsCompatible !== undefined) {
      return (
        <span className={obj.atsCompatible ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
          {obj.atsCompatible ? "ATS compatible" : "Format issues found"}
        </span>
      );
    }
    if (obj.isValid !== undefined) {
      return (
        <span className={obj.isValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
          {obj.isValid ? "Content valid" : "Content flagged"}
        </span>
      );
    }
    if (obj.summary) {
      return <span>{String(obj.summary)}</span>;
    }
    if (obj.behavioral && Array.isArray(obj.behavioral)) {
      const hasQuestions =
        obj.behavioral.length > 0 ||
        (Array.isArray(obj.technical) && obj.technical.length > 0) ||
        (Array.isArray(obj.situational) && obj.situational.length > 0) ||
        (Array.isArray(obj.questionsToAsk) && obj.questionsToAsk.length > 0) ||
        (Array.isArray(obj.talkingPoints) && obj.talkingPoints.length > 0) ||
        (Array.isArray(obj.redFlags) && obj.redFlags.length > 0) ||
        (Array.isArray(obj.interviewTips) && obj.interviewTips.length > 0);
      if (hasQuestions) {
        return (
          <InterviewPrepView
            behavioral={obj.behavioral}
            technical={Array.isArray(obj.technical) ? obj.technical : []}
            situational={Array.isArray(obj.situational) ? obj.situational : []}
            questionsToAsk={Array.isArray(obj.questionsToAsk) ? obj.questionsToAsk : []}
            talkingPoints={Array.isArray(obj.talkingPoints) ? obj.talkingPoints : []}
            redFlags={Array.isArray(obj.redFlags) ? obj.redFlags : []}
            interviewTips={Array.isArray(obj.interviewTips) ? obj.interviewTips : []}
          />
        );
      }
      return (
        <span>
          {obj.behavioral.length} behavioral, {Array.isArray(obj.technical) ? obj.technical.length : 0} technical questions
        </span>
      );
    }
    return <pre className="text-xs overflow-auto max-h-32">{JSON.stringify(obj, null, 2)}</pre>;
  }
  return String(value);
}

export default function PipelineResultsView({ pipelineId, results }: PipelineResultsViewProps) {
  const config = INTENT_PIPELINES[pipelineId];
  if (!config) return null;

  const stepLabels: Record<string, string> = {};
  config.steps.forEach((s) => {
    stepLabels[s.id] = s.label;
  });

  return (
    <div className="output-container p-6 space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {config.icon} {config.name} Results
      </h3>
      <div className="space-y-3">
        {Object.entries(results).map(([stepId, data]) => (
          <div
            key={stepId}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50"
          >
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {stepLabels[stepId] ?? stepId}
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {formatResult(stepId, data)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
