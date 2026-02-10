"use client";

import { useState } from "react";

interface StarFramework {
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
}

interface BehavioralQuestion {
  question?: string;
  why?: string;
  starFramework?: StarFramework;
  completeExample?: string;
  tips?: string[];
  keywords?: string[];
}

interface TechnicalQuestion {
  question?: string;
  category?: string;
  difficulty?: string;
  answer?: string;
  answerFramework?: string;
  resources?: { type?: string; name?: string; url?: string }[];
  relatedToResume?: boolean;
  resumeConnection?: string;
}

interface SituationalQuestion {
  question?: string;
  scenario?: string;
  approach?: string;
  exampleFromResume?: string;
  keyPoints?: string[];
}

interface QuestionToAsk {
  question?: string;
  category?: string;
  why?: string;
  followUp?: string;
}

interface TalkingPoint {
  point?: string;
  evidence?: string;
  impact?: string;
  whenToUse?: string;
}

interface RedFlag {
  issue?: string;
  evidence?: string;
  howToAddress?: string;
  positiveSpin?: string;
  preparation?: string;
}

interface InterviewPrepViewProps {
  behavioral: BehavioralQuestion[];
  technical: TechnicalQuestion[];
  situational: SituationalQuestion[];
  questionsToAsk: QuestionToAsk[];
  talkingPoints: TalkingPoint[];
  redFlags: RedFlag[];
  interviewTips: string[];
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        <span className="text-gray-500 dark:text-gray-400">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
        {title} ({count})
      </h4>
      {children}
    </div>
  );
}

export default function InterviewPrepView({
  behavioral,
  technical,
  situational,
  questionsToAsk,
  talkingPoints,
  redFlags,
  interviewTips,
}: InterviewPrepViewProps) {
  const hasContent =
    behavioral.length > 0 ||
    technical.length > 0 ||
    situational.length > 0 ||
    questionsToAsk.length > 0 ||
    talkingPoints.length > 0 ||
    redFlags.length > 0 ||
    interviewTips.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      <Section title="Behavioral Questions" count={behavioral.length}>
        <div className="space-y-2">
          {behavioral.map((q, i) => (
            <Collapsible
              key={i}
              title={q.question || `Question ${i + 1}`}
            >
              <div className="space-y-3">
                {q.why && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Why they ask: </span>
                    {q.why}
                  </div>
                )}
                {q.starFramework && (q.starFramework.situation || q.starFramework.task || q.starFramework.action || q.starFramework.result) && (
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700 dark:text-gray-200">STAR framework:</div>
                    {q.starFramework.situation && <div><span className="text-amber-600 dark:text-amber-400">Situation:</span> {q.starFramework.situation}</div>}
                    {q.starFramework.task && <div><span className="text-amber-600 dark:text-amber-400">Task:</span> {q.starFramework.task}</div>}
                    {q.starFramework.action && <div><span className="text-amber-600 dark:text-amber-400">Action:</span> {q.starFramework.action}</div>}
                    {q.starFramework.result && <div><span className="text-amber-600 dark:text-amber-400">Result:</span> {q.starFramework.result}</div>}
                  </div>
                )}
                {q.completeExample && (
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-200">Example response:</div>
                    <p className="mt-1 whitespace-pre-wrap">{q.completeExample}</p>
                  </div>
                )}
                {q.tips && q.tips.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-200">Tips:</div>
                    <ul className="list-disc list-inside mt-1">{q.tips.map((t, j) => <li key={j}>{t}</li>)}</ul>
                  </div>
                )}
                {q.keywords && q.keywords.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Keywords: </span>
                    {q.keywords.join(", ")}
                  </div>
                )}
              </div>
            </Collapsible>
          ))}
        </div>
      </Section>

      <Section title="Technical Questions" count={technical.length}>
        <div className="space-y-2">
          {technical.map((q, i) => (
            <Collapsible
              key={i}
              title={
                <span>
                  {q.question || `Question ${i + 1}`}
                  {(q.category || q.difficulty) && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      [{q.category || ""} {q.difficulty ? `· ${q.difficulty}` : ""}]
                    </span>
                  )}
                </span>
              }
            >
              <div className="space-y-3">
                {q.answer && (
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-200">Answer approach:</div>
                    <p className="mt-1 whitespace-pre-wrap">{q.answer}</p>
                  </div>
                )}
                {q.answerFramework && (
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-200">Framework:</div>
                    <p className="mt-1">{q.answerFramework}</p>
                  </div>
                )}
                {q.resumeConnection && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Connect to resume: </span>
                    {q.resumeConnection}
                  </div>
                )}
                {q.resources && q.resources.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-200">Resources:</div>
                    <ul className="list-disc list-inside mt-1">
                      {q.resources.map((r, j) => (
                        <li key={j}>{r.name || r.type || "Resource"}{r.url ? ` (${r.url})` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Collapsible>
          ))}
        </div>
      </Section>

      <Section title="Situational Questions" count={situational.length}>
        <div className="space-y-2">
          {situational.map((q, i) => (
            <Collapsible key={i} title={q.question || `Question ${i + 1}`}>
              <div className="space-y-3">
                {q.scenario && <div><span className="font-medium">Scenario:</span> {q.scenario}</div>}
                {q.approach && <div><span className="font-medium">Approach:</span> {q.approach}</div>}
                {q.exampleFromResume && <div><span className="font-medium">From resume:</span> {q.exampleFromResume}</div>}
                {q.keyPoints && q.keyPoints.length > 0 && (
                  <ul className="list-disc list-inside">{q.keyPoints.map((p, j) => <li key={j}>{p}</li>)}</ul>
                )}
              </div>
            </Collapsible>
          ))}
        </div>
      </Section>

      <Section title="Questions to Ask" count={questionsToAsk.length}>
        <div className="space-y-2">
          {questionsToAsk.map((q, i) => (
            <Collapsible key={i} title={q.question || `Question ${i + 1}`}>
              <div className="space-y-2">
                {q.category && <div><span className="font-medium">Category:</span> {q.category}</div>}
                {q.why && <div>{q.why}</div>}
                {q.followUp && <div><span className="font-medium">Follow-up:</span> {q.followUp}</div>}
              </div>
            </Collapsible>
          ))}
        </div>
      </Section>

      <Section title="Talking Points" count={talkingPoints.length}>
        <div className="space-y-2">
          {talkingPoints.map((q, i) => (
            <Collapsible key={i} title={q.point || `Point ${i + 1}`}>
              <div className="space-y-2">
                {q.evidence && <div><span className="font-medium">Evidence:</span> {q.evidence}</div>}
                {q.impact && <div><span className="font-medium">Impact:</span> {q.impact}</div>}
                {q.whenToUse && <div><span className="font-medium">When to use:</span> {q.whenToUse}</div>}
              </div>
            </Collapsible>
          ))}
        </div>
      </Section>

      <Section title="Red Flags to Address" count={redFlags.length}>
        <div className="space-y-2">
          {redFlags.map((q, i) => (
            <Collapsible key={i} title={q.issue || `Concern ${i + 1}`}>
              <div className="space-y-2">
                {q.evidence && <div><span className="font-medium">Evidence:</span> {q.evidence}</div>}
                {q.howToAddress && <div><span className="font-medium">How to address:</span> {q.howToAddress}</div>}
                {q.positiveSpin && <div><span className="font-medium">Positive spin:</span> {q.positiveSpin}</div>}
                {q.preparation && <div><span className="font-medium">Preparation:</span> {q.preparation}</div>}
              </div>
            </Collapsible>
          ))}
        </div>
      </Section>

      {interviewTips.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Interview Tips</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
            {interviewTips.map((tip, i) => (
              <li key={i}>{typeof tip === "string" ? tip : String(tip)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
