"use client";

import { useState } from "react";
import type { ElicitationFact, ElicitationQuestion } from "@/app/types/elicitation";

interface ElicitationPanelProps {
  isOpen: boolean;
  questions: ElicitationQuestion[];
  jobTitle?: string | null;
  /** Called with the facts the user actually supplied. Skipped questions are omitted. */
  onComplete: (facts: ElicitationFact[]) => void;
  /** Called when the user skips everything — the resume is tailored as it is today. */
  onSkipAll: () => void;
}

/**
 * "A few things your resume didn't say" — one plain-language screen shown after
 * the job is known, before tailoring.
 *
 * Every question is optional and has a visible Skip. The user's own words are the
 * only source of any number; we never invent, round, or strengthen an answer.
 */
export default function ElicitationPanel({
  isOpen,
  questions,
  jobTitle,
  onComplete,
  onSkipAll,
}: ElicitationPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleSkipQuestion = (id: string) => {
    setAnswers((prev) => ({ ...prev, [id]: "" }));
    setSkipped((prev) => ({ ...prev, [id]: true }));
  };

  const handleComplete = () => {
    const facts: ElicitationFact[] = questions
      .filter((q) => !skipped[q.id])
      .map((q) => ({ question: q.question, answer: (answers[q.id] || "").trim() }))
      .filter((f) => f.answer.length > 0);
    onComplete(facts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-2xl my-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            A few things your resume didn&apos;t say
          </h2>
          {jobTitle ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              For the {jobTitle} role you&apos;re going after.
            </p>
          ) : null}
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Numbers like these are what make a resume land. We&apos;ll only use what you tell us —
            we never make them up.
          </p>

          <div className="mt-6 space-y-5">
            {questions.map((q, index) => {
              const isSkipped = skipped[q.id];
              return (
                <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <label
                      htmlFor={`elicit-${q.id}`}
                      className="text-sm font-medium text-gray-800 dark:text-gray-100"
                    >
                      {index + 1}. {q.question}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSkipQuestion(q.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Skip
                    </button>
                  </div>
                  {isSkipped ? (
                    <p className="mt-2 text-xs italic text-gray-400 dark:text-gray-500">
                      Skipped — nothing will be added.
                    </p>
                  ) : (
                    <textarea
                      id={`elicit-${q.id}`}
                      value={answers[q.id] || ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Optional — a sentence or a number is plenty."
                      className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={onSkipAll}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 underline-offset-2 hover:underline"
            >
              Skip these — just tailor my resume
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Use my answers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
