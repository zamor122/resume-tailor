"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import ParallaxBackground from "./ParallaxBackground";
import ParallaxContainer from "./ParallaxContainer";
import ResumeInput from "./ResumeInput";
import JobDescriptionInput from "./JobDescriptionInput";
import TailorButton from "./TailorButton";
import ProgressStepper from "./ProgressStepper";
import ModeSelector, { type TailorMode } from "./ModeSelector";
import PipelineActionButtons from "./PipelineActionButtons";
import PipelineProgress from "./PipelineProgress";
import PipelineResultsView from "./PipelineResultsView";
import TailoredResumeOutput from "./TailoredResumeOutput";
import ImprovementHighlights from "./ImprovementHighlights";
import FreeReveal from "./FreeReveal";
import PaymentGate from "./PaymentGate";
import ResetConfirmationModal from "./ResetConfirmationModal";
import FileDropZone from "./FileDropZone";
import { extractTextFromPDF } from "@/app/utils/pdfExtractor";
import { analytics } from "@/app/services/analytics";
import { saveResumeData, loadResumeData, clearResumeData } from "@/app/utils/dataPersistence";
import type { HumanizeResponse } from "@/app/types/humanize";
import { getPipeline, type PipelineId } from "@/app/config/pipelines";

export { type HumanizeResponse } from "@/app/types/humanize";

async function runHumanizeStream(params: {
  resume: string;
  jobDescription: string;
  sessionId: string | null;
  userId: string | null;
  jobTitle?: string;
  onProgress?: (progress: number, message: string) => void;
}): Promise<HumanizeResponse> {
  const { resume, jobDescription, sessionId, userId, jobTitle, onProgress } = params;

  const response = await fetch("/api/humanize/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume,
      jobDescription,
      sessionId,
      userId: userId ?? undefined,
      jobTitle: jobTitle ?? undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Failed to tailor resume");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let completeData: any = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("data: ")) {
        try {
          const parsed = JSON.parse(lines[i].slice(6).trim());
          if (parsed.stage && parsed.progress !== undefined) {
            onProgress?.(parsed.progress, parsed.message || "");
          }
          if (parsed.tailoredResume) {
            completeData = parsed;
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Failed to tailor resume") {
            // JSON parse or error from server
            if (completeData) break;
            throw e;
          }
        }
      }
    }
  }

  if (!completeData) throw new Error("No result received");

  return {
    originalResume: resume,
    tailoredResume: completeData.tailoredResume,
    obfuscatedResume: completeData.tailoredResume,
    contentMap: completeData.contentMap,
    freeReveal: completeData.freeReveal,
    improvementMetrics: completeData.improvementMetrics,
    matchScore: completeData.matchScore,
    metrics: completeData.metrics,
    validationResult: completeData.validationResult,
    resumeId: completeData.resumeId,
    hasAccess: true,
  };
}

export default function SplitScreenTailorView() {
  const router = useRouter();
  const { user } = useAuth();
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HumanizeResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [hasStartedTailoring, setHasStartedTailoring] = useState(false);
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [fileDropKey, setFileDropKey] = useState(0);
  const [mode, setMode] = useState<TailorMode>("quick");
  const [loadingPipelineId, setLoadingPipelineId] = useState<PipelineId | null>(null);
  const [pipelineResults, setPipelineResults] = useState<{
    pipelineId: PipelineId;
    results: Record<string, unknown>;
  } | null>(null);
  const [pipelineStepIndex, setPipelineStepIndex] = useState(0);
  const [detectedJobTitle, setDetectedJobTitle] = useState<string | null>(null);

  useEffect(() => {
    let sid = typeof window !== "undefined" ? localStorage.getItem("resume-tailor-session-id") : null;
    if (!sid) {
      sid = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (typeof window !== "undefined") {
        localStorage.setItem("resume-tailor-session-id", sid);
      }
    }
    setSessionId(sid);

    const stored = loadResumeData();
    if (stored) {
      setResume(stored.resumeText || "");
      setJobDescription(stored.jobDescription || "");
      if (stored.results) {
        const r = stored.results as HumanizeResponse;
        setResults(r);
        setHasStartedTailoring(!!r);
      }
    }
  }, []);

  useEffect(() => {
    if (sessionId && (resume || jobDescription || results)) {
      saveResumeData({
        resumeText: resume,
        jobDescription,
        results,
        sessionId,
        uploadMode: "paste",
        timestamp: Date.now(),
      });
    }
  }, [resume, jobDescription, results, sessionId]);

  useEffect(() => {
    if (jobDescription.trim().length < 50) setDetectedJobTitle(null);
  }, [jobDescription]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTailor = useCallback(async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Please enter both your resume and the job description.");
      return;
    }
    if (resume.trim().length < 100) {
      setError("Please provide a more detailed resume (minimum 100 characters).");
      return;
    }
    if (jobDescription.trim().length < 100) {
      setError("Please provide a more detailed job description (minimum 100 characters).");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setHasStartedTailoring(true);

    analytics.trackEvent(analytics.events.RESUME_TAILOR, {
      timestamp: new Date().toISOString(),
      hasResume: !!resume,
      hasJobDescription: !!jobDescription,
    });

    let didRedirect = false;
    try {
      let jobTitleToUse = detectedJobTitle ?? undefined;
      if (!jobTitleToUse && jobDescription.trim().length >= 100) {
        try {
          const titleRes = await fetch("/api/tailor/job/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescription: jobDescription.trim() }),
          });
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            if (titleData?.jobTitle) jobTitleToUse = titleData.jobTitle;
          }
        } catch {
          // use undefined and let backend fallback
        }
      }
      const data = await runHumanizeStream({
        resume: resume.trim(),
        jobDescription: jobDescription.trim(),
        sessionId,
        userId: user?.id ?? null,
        jobTitle: jobTitleToUse,
        onProgress: () => {},
      });

      analytics.trackEvent(analytics.events.RESUME_TAILOR_SUCCESS, {
        timestamp: new Date().toISOString(),
        matchScore: data?.matchScore,
      });

      if (data.resumeId) {
        didRedirect = true;
        setRedirecting(true);
        router.push(`/resume/${data.resumeId}`);
      } else {
        setResults(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      setErrorShakeKey((k) => k + 1);
      setHasStartedTailoring(false);
      analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
        error: message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      if (!didRedirect) setLoading(false);
    }
  }, [resume, jobDescription, sessionId, user?.id, router]);

  const handleRunPipeline = useCallback(
    async (pipelineId: PipelineId) => {
      const config = getPipeline(pipelineId);
      if (config.requiresResume && resume.trim().length < 100) {
        setError("Resume must be at least 100 characters.");
        return;
      }
      if (config.requiresJobDescription && (!jobDescription.trim() || jobDescription.trim().length < 100)) {
        setError("Job description must be at least 100 characters.");
        return;
      }

      setLoadingPipelineId(pipelineId);
      setError(null);
      setPipelineResults(null);
      setPipelineStepIndex(0);

      try {
        const res = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pipelineId,
            resume: resume.trim(),
            jobDescription: jobDescription.trim(),
            sessionId,
            userId: user?.id ?? undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || "Pipeline failed");
        }

        const hasTailor = data.results?.tailor;
        if (hasTailor) {
          const tailorData = data.results.tailor as {
            tailoredResume: string;
            originalResume: string;
            matchScore?: { before: number; after: number };
            improvementMetrics?: Record<string, number>;
            validationResult?: unknown;
            resumeId?: string;
          };
          const humanizeResponse: HumanizeResponse = {
            originalResume: tailorData.originalResume,
            tailoredResume: tailorData.tailoredResume,
            obfuscatedResume: tailorData.tailoredResume,
            contentMap: undefined,
            freeReveal: undefined,
            improvementMetrics: tailorData.improvementMetrics,
            matchScore: tailorData.matchScore,
            validationResult: tailorData.validationResult,
            resumeId: tailorData.resumeId,
            hasAccess: true,
          };
          setResults(humanizeResponse);
          setHasStartedTailoring(true);
          if (tailorData.resumeId) {
            setRedirecting(true);
            router.push(`/resume/${tailorData.resumeId}`);
          }
        } else {
          setPipelineResults({ pipelineId, results: data.results || {} });
          setHasStartedTailoring(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Pipeline failed";
        setError(message);
        setErrorShakeKey((k) => k + 1);
      } finally {
        setLoadingPipelineId(null);
      }
    },
    [resume, jobDescription, sessionId, user?.id, router]
  );

  useEffect(() => {
    if (!loadingPipelineId) return;
    const config = getPipeline(loadingPipelineId);
    const steps = config.steps;
    const interval = setInterval(() => {
      setPipelineStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [loadingPipelineId]);

  const handleReset = useCallback(() => {
    setResume("");
    setJobDescription("");
    setResults(null);
    setPipelineResults(null);
    setError(null);
    setHasStartedTailoring(false);
    setFileDropKey((k) => k + 1);
    clearResumeData();
    setShowResetModal(false);
  }, []);

  const extractTextForFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      const { text } = await extractTextFromPDF(file);
      return text;
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }, []);

  const handleFileAccepted = useCallback((text: string) => {
    setResume(text);
    setError(null);
  }, []);

  const handleFileError = useCallback((message: string) => {
    setError(message);
  }, []);

  const displayResume = results?.tailoredResume ?? results?.obfuscatedResume ?? "";

  return (
    <>
      <ParallaxBackground />
      <ParallaxContainer className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 max-w-6xl space-y-8 md:space-y-12">
        {/* Hero */}
        <section className="py-8 md:py-16 text-center" data-parallax="0.05">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">
            Make Your Resume Sound Like You—Only Better
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            We tailor your resume to each job so it reads naturally and passes ATS filters. No robotic keyword stuffing.
          </p>
          <button
            onClick={() => scrollToSection("tailorResume")}
            className="px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
          >
            Get Started
          </button>
        </section>

        {/* How It Works */}
        <section id="howItWorks" className="py-6 md:py-8" data-parallax="0.08">
          <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6 md:mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold">1</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Add your resume</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Upload a PDF or paste your resume</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold">2</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Paste the job posting</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Copy the job description you&apos;re applying for</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">3</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Get a resume that sounds like you</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive a version that matches the job and keeps your voice</p>
            </div>
          </div>
        </section>

        {/* Input Section */}
        <div id="tailorResume" className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 md:items-stretch">
          <div className="space-y-4 flex flex-col">
            <FileDropZone
              key={fileDropKey}
              onFileAccepted={handleFileAccepted}
              onError={handleFileError}
              accept=".pdf,.txt"
              extractText={extractTextForFile}
            />
            <ResumeInput
              label="Your Resume"
              placeholder="Paste your resume here or upload a PDF above..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>
          <div className="flex flex-col min-h-[320px] md:min-h-[400px] md:h-full">
            <JobDescriptionInput
              label="Job Description"
              placeholder="Paste the job posting you're applying for..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onTitleDetected={(title) => setDetectedJobTitle(title || null)}
              fillHeight
            />
          </div>
        </div>

        {/* Mode Selector with Tabbed Actions */}
        <div className="input-container p-0 overflow-hidden">
          <ModeSelector value={mode} onChange={setMode} />
          <div
            role="tabpanel"
            id={`mode-panel-${mode}`}
            aria-labelledby={`mode-tab-${mode}`}
            className="p-5 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {(resume.trim() || jobDescription.trim()) && (
              <div className="flex items-center justify-center gap-4 text-sm mb-4">
                <span className={`flex items-center gap-1.5 ${resume.trim().length >= 100 ? "text-cyan-500 dark:text-cyan-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {resume.trim().length >= 100 ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-current" />
                  )}
                  Resume {resume.trim().length >= 100 ? "Ready" : "min 100 chars"}
                </span>
                <span className={`flex items-center gap-1.5 ${jobDescription.trim().length >= 100 ? "text-cyan-500 dark:text-cyan-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {jobDescription.trim().length >= 100 ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-current" />
                  )}
                  Job {jobDescription.trim().length >= 100 ? "Ready" : "min 100 chars"}
                </span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              Resume (min 100 chars) and Job Description (min 100 chars) required for Apply to Job and Full Optimization
            </p>

            {mode === "quick" && (
              <div className="text-center space-y-3">
                <TailorButton
                  loading={loading}
                  onClick={handleTailor}
                  disabled={!resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100}
                  ready={resume.trim().length >= 100 && jobDescription.trim().length >= 100}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get a resume that sounds like you and matches the job
                </p>
              </div>
            )}

            {mode === "pipeline" && (
              <div className="w-full max-w-2xl mx-auto">
                <PipelineActionButtons
                  resume={resume}
                  jobDescription={jobDescription}
                  loadingPipelineId={loadingPipelineId}
                  onRunPipeline={handleRunPipeline}
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            key={errorShakeKey}
            className="animate-shake p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30 text-pink-700 dark:text-pink-400" role="alert"
          >
            {error}
          </div>
        )}

        {(resume || jobDescription || results || pipelineResults) && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              Start over
            </button>
          </div>
        )}

        {(loading || redirecting) && <ProgressStepper isActive={true} />}

        {loadingPipelineId && (
          <PipelineProgress
            steps={getPipeline(loadingPipelineId).steps.map((s, i) => ({
              id: s.id,
              label: s.label,
              status:
                i < pipelineStepIndex
                  ? ("complete" as const)
                  : i === pipelineStepIndex
                    ? ("active" as const)
                    : ("pending" as const),
            }))}
            currentMessage="Running pipeline... This may take 1-2 minutes"
          />
        )}

        {/* Results */}
        {hasStartedTailoring && results && !loading && !loadingPipelineId && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8" data-parallax="0.05">
            <div className="md:col-span-8 space-y-6">
              <div className="output-container">
                <h3 className="text-2xl font-semibold mb-4 gradient-text-emerald">Your Tailored Resume</h3>
                <PaymentGate resumeId={results.resumeId ?? undefined} onUnlock={() => {}}>
                  {results.freeReveal && !results.hasAccess && (
                    <FreeReveal
                      section={results.freeReveal.section}
                      originalText={results.freeReveal.originalText}
                      improvedText={results.freeReveal.improvedText}
                    />
                  )}
                  <TailoredResumeOutput newResume={displayResume} loading={false} />
                </PaymentGate>
              </div>
            </div>
            <div className="md:col-span-4 space-y-6">
              {results.matchScore && (
                <div className="output-container p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Job Match Strength</h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your resume</p>
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{results.matchScore.before}%</p>
                    </div>
                    <span className="text-xl text-gray-400">→</span>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Optimized</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results.matchScore.after}%</p>
                    </div>
                    {results.matchScore.after - results.matchScore.before > 0 && (
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{results.matchScore.after - results.matchScore.before} pts
                      </span>
                    )}
                  </div>
                  {results.metrics?.before && results.metrics?.after && (
                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {results.metrics.before.jdCoverage && results.metrics.after.jdCoverage && results.metrics.after.jdCoverage.total > 0 && (
                        <div className="flex justify-between"><span>JD coverage</span><span>{results.metrics.before.jdCoverage.percentage}% → {results.metrics.after.jdCoverage.percentage}%</span></div>
                      )}
                      {results.metrics.before.criticalKeywords && results.metrics.after.criticalKeywords && results.metrics.after.criticalKeywords.total > 0 && (
                        <div className="flex justify-between"><span>Critical keywords</span><span>{results.metrics.before.criticalKeywords.matched}/{results.metrics.before.criticalKeywords.total} → {results.metrics.after.criticalKeywords.matched}/{results.metrics.after.criticalKeywords.total}</span></div>
                      )}
                      {results.metrics.before.concreteEvidence && results.metrics.after.concreteEvidence && (
                        <div className="flex justify-between"><span>Concrete evidence</span><span>{results.metrics.before.concreteEvidence.percentage}% → {results.metrics.after.concreteEvidence.percentage}%</span></div>
                      )}
                      {typeof results.metrics.before.platformOwnership === "number" && typeof results.metrics.after.platformOwnership === "number" && (
                        <div className="flex justify-between"><span>Platform signals</span><span>{results.metrics.before.platformOwnership} → {results.metrics.after.platformOwnership}</span></div>
                      )}
                      {results.metrics.before.skimSuccess && results.metrics.after.skimSuccess && (
                        <div className="flex justify-between"><span>Skim success</span><span>{results.metrics.before.skimSuccess.percentage}% → {results.metrics.after.skimSuccess.percentage}%</span></div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="improvement-container">
                <h3 className="text-lg font-semibold mb-3 text-amber-600 dark:text-amber-400">Improvement Summary</h3>
                <ImprovementHighlights
                  metrics={{ ...results.improvementMetrics, matchScore: results.matchScore }}
                  beforeMetrics={results.metrics?.before ?? null}
                  afterMetrics={results.metrics?.after ?? null}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Results (non-tailor pipelines) */}
        {pipelineResults && !loading && !loadingPipelineId && (
          <div className="max-w-2xl mx-auto" data-parallax="0.05">
            <PipelineResultsView
              pipelineId={pipelineResults.pipelineId}
              results={pipelineResults.results}
            />
          </div>
        )}
      </ParallaxContainer>

      <ResetConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
