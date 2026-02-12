"use client";

interface BehavioralItem {
  question?: string;
  why?: string;
  starFramework?: Record<string, string>;
  completeExample?: string;
  tips?: string[];
  keywords?: string[];
}

interface TechnicalItem {
  question?: string;
  category?: string;
  difficulty?: string;
  answer?: string;
  answerFramework?: string;
  resources?: Array<{ type?: string; name?: string; url?: string }>;
  relatedToResume?: boolean;
  resumeConnection?: string;
}

interface SituationalItem {
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

interface InterviewPrepViewProps {
  behavioral: unknown[];
  technical: unknown[];
  situational: unknown[];
  questionsToAsk: unknown[];
  talkingPoints: unknown[];
  redFlags: unknown[];
  interviewTips: unknown[];
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
        {title}
      </h5>
      {children}
    </div>
  );
}

function ListItems({ items }: { items: unknown[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
      {items.map((item, i) => (
        <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
      ))}
    </ul>
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
  const b = behavioral as BehavioralItem[];
  const t = technical as TechnicalItem[];
  const s = situational as SituationalItem[];
  const q = questionsToAsk as QuestionToAsk[];

  return (
    <div className="space-y-6 text-sm">
      {b.length > 0 && (
        <Section title="Behavioral questions">
          <div className="space-y-4">
            {b.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {item.question}
                </p>
                {item.why && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                    Why: {item.why}
                  </p>
                )}
                {item.completeExample && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                    {item.completeExample}
                  </p>
                )}
                {item.tips && item.tips.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Tips: {item.tips.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {t.length > 0 && (
        <Section title="Technical questions">
          <div className="space-y-3">
            {t.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {item.question}
                </p>
                {(item.category || item.difficulty) && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {[item.category, item.difficulty].filter(Boolean).join(" • ")}
                  </p>
                )}
                {item.answer && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {s.length > 0 && (
        <Section title="Situational questions">
          <div className="space-y-3">
            {s.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {item.question}
                </p>
                {item.approach && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    {item.approach}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {q.length > 0 && (
        <Section title="Questions to ask">
          <ul className="space-y-2">
            {q.map((item, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">
                {typeof item === "string" ? item : item.question}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {talkingPoints.length > 0 && (
        <Section title="Talking points">
          <ListItems items={talkingPoints} />
        </Section>
      )}

      {redFlags.length > 0 && (
        <Section title="Red flags to address">
          <ListItems items={redFlags} />
        </Section>
      )}

      {interviewTips.length > 0 && (
        <Section title="Interview tips">
          <ListItems items={interviewTips} />
        </Section>
      )}
    </div>
  );
}
