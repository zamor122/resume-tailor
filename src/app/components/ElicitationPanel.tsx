"use client";

import { useState, useEffect, useRef } from "react";
import type { ElicitationFact, ElicitationQuestion } from "@/app/types/elicitation";
import { useGamification } from "@/app/contexts/GamificationContext";
import {
  getSavedElicitationAnswers,
  saveElicitationAnswers,
  normalizeElicitationKey,
} from "@/app/utils/elicitation";

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
  const { playSfx, awardXp } = useGamification();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [rememberedKeys, setRememberedKeys] = useState<Set<string>>(new Set());
  const hasAwardedXpRef = useRef<boolean>(false);

  // Pre-populate answers from previous sessions if available
  useEffect(() => {
    if (!isOpen || questions.length === 0) return;
    const saved = getSavedElicitationAnswers();
    const initial: Record<string, string> = {};
    const remembered = new Set<string>();

    for (const q of questions) {
      const key = normalizeElicitationKey(q.question);
      if (saved[key]) {
        initial[q.id] = saved[key];
        remembered.add(q.id);
      }
    }

    if (Object.keys(initial).length > 0) {
      setAnswers((prev) => ({ ...initial, ...prev }));
      setRememberedKeys(remembered);
    }
  }, [isOpen, questions]);

  if (!isOpen) return null;

  const handleSkipQuestion = (id: string) => {
    playSfx("click");
    setAnswers((prev) => ({ ...prev, [id]: "" }));
    setSkipped((prev) => ({ ...prev, [id]: true }));
  };

  const handleComplete = () => {
    playSfx("success");
    const facts: ElicitationFact[] = questions
      .filter((q) => !skipped[q.id])
      .map((q) => ({ question: q.question, answer: (answers[q.id] || "").trim() }))
      .filter((f) => f.answer.length > 0);

    // Save answered facts into history for future tailoring
    if (facts.length > 0) {
      saveElicitationAnswers(facts);
      if (!hasAwardedXpRef.current) {
        hasAwardedXpRef.current = true;
        const dedupeKey = `elicitation_${questions.map((q) => q.id).sort().join("_")}`;
        awardXp(30, "Added Specific Metrics (+30 XP)", dedupeKey);
      }
    }
    onComplete(facts);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="w-full max-w-2xl my-8 neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl text-[#1C2028]">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="neo-tag bg-[#FF5722] text-white text-[9px] px-2 py-0.5 font-mono font-bold uppercase tracking-wider">
              GOOGLE X-Y-Z CALIBRATION
            </span>
            <span className="text-xs font-mono text-gray-500">
              OPTIONAL REFINEMENT
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028]">
            A Few Things Your Resume Didn&apos;t Say
          </h2>
          {jobTitle ? (
            <p className="mt-1 text-xs font-mono text-gray-600">
              Target role: <span className="font-bold text-[#1C2028]">{jobTitle}</span>
            </p>
          ) : null}
          <p className="mt-3 text-xs sm:text-sm text-gray-700 leading-relaxed font-sans">
            Recruiters look for concrete outcomes (revenue, speed, latency, users). Answer only what you know—we will weave your real metrics into the bullets with zero fabrication.
          </p>

          <div className="mt-6 space-y-4">
            {questions.map((q, index) => {
              const isSkipped = skipped[q.id];
              return (
                <div key={q.id} className="neo-box bg-[#F4F1EA] p-4 border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor={`elicit-${q.id}`}
                        className="text-xs sm:text-sm font-mono font-bold text-[#1C2028]"
                      >
                        {index + 1}. {q.question}
                      </label>
                      {rememberedKeys.has(q.id) && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="neo-tag bg-[#10B981] text-white text-[9px] px-1.5 py-0.2 font-mono font-bold">
                            ✓ SAVED ANSWER REPOPULATED
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSkipQuestion(q.id)}
                      className="shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-gray-500 hover:text-[#1C2028] hover:bg-white border border-transparent hover:border-[#1C2028] transition-all"
                    >
                      Skip
                    </button>
                  </div>
                  {isSkipped ? (
                    <p className="mt-2 text-xs font-mono italic text-gray-400">
                      Skipped — nothing will be modified for this item.
                    </p>
                  ) : (
                    <textarea
                      id={`elicit-${q.id}`}
                      value={answers[q.id] || ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Optional — e.g., '10,000 users', 'cut load times by 40%', 'led 4 engineers'"
                      className="mt-2.5 w-full rounded-lg border-2 border-[#1C2028] bg-white p-2.5 text-xs sm:text-sm text-[#1C2028] placeholder:text-gray-400 font-mono shadow-[2px_2px_0px_#1C2028] focus:outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[#1C2028]/15">
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                onSkipAll();
              }}
              className="text-xs font-mono font-bold text-gray-500 hover:text-[#1C2028] underline transition-colors"
            >
              Skip these — tailor directly
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="neo-btn inline-flex items-center justify-center rounded-lg bg-[#FF5722] hover:bg-[#E64A19] px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>⚡ WEAVE MY METRICS</span>
              <span className="bg-black/25 text-white text-[10px] px-1.5 py-0.5 rounded-sm ml-2">+30 XP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
