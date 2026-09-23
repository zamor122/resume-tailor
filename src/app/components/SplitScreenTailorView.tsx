"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { fetchResumeById } from "@/app/lib/swr-fetchers";
import { useJobTitle } from "@/app/hooks/useJobTitle";
import ParallaxBackground from "./ParallaxBackground";
import ParallaxContainer from "./ParallaxContainer";
import ResumeInput from "./ResumeInput";
import JobDescriptionInput from "./JobDescriptionInput";
import TailorButton from "./TailorButton";
import AuthGate from "./AuthGate";
import AuthModal from "./AuthModal";
import ProgressStepper from "./ProgressStepper";
import ResetConfirmationModal from "./ResetConfirmationModal";
import FileDropZone from "./FileDropZone";
import HomepageSEOSection from "./HomepageSEOSection";
import TailoredResumeOutput from "./TailoredResumeOutput";
import TailoringControlsPanel from "./TailoringControlsPanel";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { extractTextFromPDF } from "@/app/utils/pdfExtractor";
import { analytics } from "@/app/services/analytics";
import { saveResumeData, loadResumeData, clearResumeData } from "@/app/utils/dataPersistence";
import { TAILORING_PRESET_LABELS } from "@/app/prompts/tailoringPresets";
import { FREE_RESUME_LIMIT } from "@/app/config/pricing";
import type { HumanizeResponse } from "@/app/types/humanize";

export { type HumanizeResponse } from "@/app/types/humanize";

const TAILOR_TIMEOUT_MS = 62_000; // Slightly over 60s maxDuration to detect timeout

async function runHumanizeStream(params: {
  resume: string;
  jobDescription: string;
  sessionId: string | null;
  userId: string | null;
  accessToken?: string;
  jobTitle?: string;
  onProgress?: (progress: number, message: string) => void;
  parentResumeId?: string;
  customInstructions?: string;
  keywordsToWeave?: string[];
  promptPresetIds?: string[];
  preferences?: TailoringPreferences;
}): Promise<HumanizeResponse> {
  const {
    resume,
    jobDescription,
    sessionId,
    userId,
    accessToken,
    jobTitle,
    onProgress,
    parentResumeId,
    customInstructions,
    keywordsToWeave,
    promptPresetIds,
    preferences,
  } = params;

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(
    () => controller.abort(),
    TAILOR_TIMEOUT_MS
  );

  try {
    const response = await fetch("/api/humanize/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume,
        jobDescription,
        sessionId,
        userId: userId ?? undefined,
        accessToken: accessToken ?? undefined,
        jobTitle: jobTitle ?? undefined,
        parentResumeId: parentResumeId ?? undefined,
        customInstructions: customInstructions ?? undefined,
        keywordsToWeave: keywordsToWeave?.length ? keywordsToWeave : undefined,
        promptPresetIds: promptPresetIds?.length ? promptPresetIds : undefined,
        preferences,
      }),
      signal: controller.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body.message || body.error || "Failed to tailor resume";
      const tailoredError = new Error(msg) as Error & { statusCode?: number; anonymousLimitExceeded?: boolean };
      tailoredError.statusCode = response.status;
      if (body.anonymousLimitExceeded) tailoredError.anonymousLimitExceeded = true;
      throw tailoredError;
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
            if (parsed.stage || parsed.step || parsed.message) {
              console.log(`[Tailor Stream] ⚡ Progress: ${parsed.progress}% - ${parsed.message || parsed.step}`);
            }
            if (parsed.progress !== undefined) {
              onProgress?.(parsed.progress, parsed.message || "");
            }
            if (parsed.tailoredResume) {
              console.log(`[Tailor Stream] ✅ Received complete payload:`, {
                tailoredLength: parsed.tailoredResume.length,
                beforeScore: parsed.beforeScore,
                matchScore: parsed.matchScore,
                improvementMetrics: parsed.improvementMetrics,
                agentSteps: parsed.agentSteps,
                resumeId: parsed.resumeId,
              });
              completeData = parsed;
            }
            if (parsed.error) {
              console.error(`[Tailor Stream] ❌ Server returned error:`, parsed.error);
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

    // Process any remaining data in the buffer after stream closed
    if (!completeData && buffer.trim()) {
      const remainingLines = buffer.split("\n");
      for (const line of remainingLines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6).trim());
            if (parsed.tailoredResume) {
              completeData = parsed;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Failed to tailor resume") {
              if (completeData) break;
              throw e;
            }
          }
        }
      }
    }

    if (!completeData) {
      if (controller.signal.aborted) {
        throw new Error("Request timed out. Please try again with a shorter resume or job description.");
      }
      throw new Error("The tailoring connection was interrupted before completion. Please try tailoring again.");
    }

    return {
      originalResume: resume,
      tailoredResume: completeData.tailoredResume,
      obfuscatedResume: completeData.tailoredResume,
      contentMap: completeData.contentMap,
      freeReveal: completeData.freeReveal,
      suggestions: completeData.suggestions || [],
      sectionGroups: completeData.sectionGroups,
      resumeAST: completeData.resumeAST,
      improvementMetrics: completeData.improvementMetrics,
      matchScore: completeData.matchScore,
      beforeScore: completeData.beforeScore,
      metrics: completeData.metrics,
      validationResult: completeData.validationResult,
      resumeId: completeData.resumeId,
      hasAccess: true,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function SplitScreenTailorView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillResumeId = searchParams.get("prefillResumeId");
  const prefillVersion = searchParams.get("prefillVersion");
  const { user, session } = useAuth();
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
  const [detectedJobTitle, setDetectedJobTitle] = useState<string | null>(null);
  const [parentResumeId, setParentResumeId] = useState<string | undefined>(undefined);
  const [customInstructions, setCustomInstructions] = useState("");
  const [keywordsToWeave, setKeywordsToWeave] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [promptPresetIds, setPromptPresetIds] = useState<string[]>([]);
  const [tailoringOptionsOpen, setTailoringOptionsOpen] = useState(false);
  const [showAuthModalMode, setShowAuthModalMode] = useState<"signup" | "signin" | null>(null);
  const [preferences, setPreferences] = useState<TailoringPreferences>(DEFAULT_PREFERENCES);
  const [agentMessage, setAgentMessage] = useState<string>("");
  const [agentProgress, setAgentProgress] = useState<number | undefined>(undefined);
  const [activeMobileTab, setActiveMobileTab] = useState<"resume" | "job" | "options">("resume");
  const prefillSyncedForRef = useRef<string | null>(null);

  const keywordsToWeaveParam = searchParams.get("keywordsToWeave");
  const prefillId = prefillVersion ?? prefillResumeId;
  const prefillSwrKey =
    prefillId && user?.id && session?.access_token
      ? (["resume", prefillId, user.id] as const)
      : null;
  const prefillFetcher = useCallback(
    ([, resumeId, userId]: readonly [string, string, string]) =>
      fetchResumeById(resumeId, userId, session?.access_token ?? undefined),
    [session?.access_token]
  );
  const { data: prefillData } = useSWR(prefillSwrKey, prefillFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const { jobTitle: jobTitleFromHook } = useJobTitle(jobDescription, { enabled: true });

  useEffect(() => {
    if (!prefillId) {
      prefillSyncedForRef.current = null;
      return;
    }
    if (!prefillData?.originalResume) return;
    if (prefillSyncedForRef.current === prefillId) return;
    prefillSyncedForRef.current = prefillId;
    setError(null);
    if (prefillVersion) {
      setResume(String(prefillData.tailoredResume ?? prefillData.originalResume ?? ""));
      setJobDescription(String(prefillData.jobDescription ?? ""));
      setParentResumeId(prefillVersion);
      if (keywordsToWeaveParam) {
        try {
          const decoded = decodeURIComponent(keywordsToWeaveParam);
          const keywords = decoded.split(",").map((s) => s.trim()).filter(Boolean);
          if (keywords.length > 0) {
            setKeywordsToWeave(keywords);
            setTailoringOptionsOpen(true);
          }
        } catch {
          // ignore invalid param
        }
      }
    } else {
      setResume(String(prefillData.originalResume ?? ""));
      setJobDescription("");
      setParentResumeId(undefined);
      analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
        ...analytics.getTrackingContext({
          section: "tailorResume",
          element: "link",
          label: "prefill",
          resumeId: prefillResumeId ?? undefined,
          source: "prefill",
        }),
      });
    }
  }, [prefillId, prefillVersion, prefillResumeId, prefillData, keywordsToWeaveParam]);

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
        if (r?.resumeId) {
          router.replace(`/resume/${r.resumeId}`);
          return;
        }
      }
    }
  }, [router]);

  useEffect(() => {
    if (results && !loading && !user) {
      const el = document.getElementById("results-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [results, loading, user]);

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
    setAgentMessage("Analyzing your resume and target job requirements...");
    setAgentProgress(10);

    const source = prefillResumeId ? "prefill" : (resume.trim().length > 0 ? "return_visit" : "blank");
    analytics.trackEvent(analytics.events.RESUME_TAILOR, {
      ...analytics.getTrackingContext({
        section: "tailorResume",
        element: "tailor_button",
        hasResume: !!resume.trim(),
        hasJobDescription: !!jobDescription.trim(),
        resumeCharCount: resume.trim().length,
        jobDescCharCount: jobDescription.trim().length,
        source,
      }),
    });

    let didRedirect = false;
    try {
      const jobTitleToUse = detectedJobTitle ?? jobTitleFromHook ?? undefined;
      const data = await runHumanizeStream({
        resume: resume.trim(),
        jobDescription: jobDescription.trim(),
        sessionId,
        userId: user?.id ?? null,
        accessToken: session?.access_token ?? undefined,
        jobTitle: jobTitleToUse,
        onProgress: (progress, message) => {
          setAgentProgress(progress);
          if (message) setAgentMessage(message);
        },
        parentResumeId,
        customInstructions: customInstructions.trim() || undefined,
        keywordsToWeave: keywordsToWeave.length ? keywordsToWeave : undefined,
        promptPresetIds: promptPresetIds.length ? promptPresetIds : undefined,
        preferences,
      });

      let timeToValueSeconds: number | undefined;
      if (typeof window !== "undefined") {
        try {
          const start = sessionStorage.getItem("airesumetailor_session_start");
          if (start) {
            timeToValueSeconds = Math.round((Date.now() - Number(start)) / 1000);
          }
        } catch {
          // ignore
        }
      }
      analytics.trackEvent(analytics.events.RESUME_TAILOR_SUCCESS, {
        ...analytics.getTrackingContext({
          section: "tailorResume",
          element: "tailor_button",
          resumeId: data?.resumeId ?? undefined,
        }),
        matchScore: data?.matchScore,
        ...(timeToValueSeconds !== undefined && { timeToValueSeconds }),
      });
      try {
        if (typeof window !== "undefined") sessionStorage.setItem("airesumetailor_converted", "1");
      } catch {
        // ignore
      }

      if (data.resumeId) {
        didRedirect = true;
        setRedirecting(true);
        router.push(`/resume/${data.resumeId}`);
      } else {
        setResults(data);
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "An error occurred";
      const isAbort = err instanceof Error && err.name === "AbortError";
      const isNetwork =
        err instanceof TypeError && (
          rawMessage.includes("fetch") ||
          rawMessage.includes("network") ||
          rawMessage.includes("Failed to fetch")
        );
      const statusCode = (err as Error & { statusCode?: number }).statusCode;
      const anonymousLimitExceeded = (err as Error & { anonymousLimitExceeded?: boolean }).anonymousLimitExceeded;

      let userMessage = rawMessage;
      let errorType = "unknown";
      if (statusCode === 401 && anonymousLimitExceeded) {
        userMessage = "You've used your free preview. Create a free account to get 3 full tailors.";
        errorType = "anonymous_limit";
        setShowAuthModalMode("signup");
      } else if (isAbort) {
        userMessage = "Request timed out. Please try again with a shorter resume or job description.";
        errorType = "timeout";
      } else if (isNetwork) {
        userMessage = "Network error. Please check your connection and try again.";
        errorType = "network";
      } else if (statusCode === 504) {
        userMessage = "Request timed out. Please try again.";
        errorType = "timeout";
      } else if (statusCode === 429) {
        userMessage = rawMessage; // Keep server message for rate limit
        errorType = "rate_limit";
      }

      setError(userMessage);
      setErrorShakeKey((k) => k + 1);
      setHasStartedTailoring(false);
      analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
        ...analytics.getTrackingContext({
          section: "tailorResume",
          element: "tailor_button",
          resumeCharCount: resume.trim().length,
          jobDescCharCount: jobDescription.trim().length,
        }),
        error: rawMessage,
        errorType,
        statusCode: statusCode ?? null,
      });
    } finally {
      if (!didRedirect) setLoading(false);
    }
  }, [resume, jobDescription, sessionId, user, session, router, prefillResumeId, detectedJobTitle, jobTitleFromHook, parentResumeId, customInstructions, keywordsToWeave, promptPresetIds]);

  const handleReset = useCallback(() => {
    setResume("");
    setJobDescription("");
    setResults(null);
    setError(null);
    setHasStartedTailoring(false);
    setFileDropKey((k) => k + 1);
    setParentResumeId(undefined);
    setCustomInstructions("");
    setKeywordsToWeave([]);
    setKeywordInput("");
    setPromptPresetIds([]);
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

  return (
    <>
      <ParallaxBackground />
      <ParallaxContainer className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 max-w-6xl space-y-8 md:space-y-12">
        {/* Hero */}
        <section className="py-8 md:py-12 text-center" data-parallax="0.05">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
            Free AI Resume Tailor: Optimize Your Resume for Any Job Posting
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Tailor your resume to each job in seconds. Still you—just refined.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            First {FREE_RESUME_LIMIT} free — no credit card required.
          </p>
          <button
            onClick={() => {
              analytics.trackEvent(analytics.events.CLICK, {
                ...analytics.getTrackingContext({ section: "hero", element: "hero_cta", label: "Get Started" }),
                destination: "#tailorResume",
              });
              scrollToSection("tailorResume");
            }}
            className="px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
          >
            Get Started
          </button>
        </section>

        {parentResumeId && prefillData && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/80 dark:bg-cyan-950/40 px-4 py-3 text-sm text-cyan-800 dark:text-cyan-200">
            <svg className="w-5 h-5 shrink-0 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {prefillData.jobTitle?.trim()
                ? `You're creating a new version from your tailored resume for ${prefillData.jobTitle.trim()}.`
                : "You're creating a new version from your last tailored resume."}
            </span>
          </div>
        )}

        {/* Mobile Step Switcher (md:hidden) */}
        <div className="md:hidden flex items-center justify-between p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveMobileTab("resume")}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === "resume"
                ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <span>📄 1. Resume</span>
            {resume.trim().length >= 100 ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab("job")}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMobileTab === "job"
                ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <span>💼 2. Target Job</span>
            {jobDescription.trim().length >= 100 ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>
        </div>

        {/* Input Section - Side by side on desktop, active tab on mobile */}
        <div id="tailorResume" className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 md:items-stretch">
          {/* Resume Column */}
          <div className={`space-y-4 flex flex-col ${activeMobileTab === "resume" || "hidden md:flex"}`}>
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

          {/* Job Description Column */}
          <div className={`flex flex-col min-h-[320px] md:min-h-[400px] md:h-full ${activeMobileTab === "job" || "hidden md:flex"}`}>
            <JobDescriptionInput
              label="Job Description"
              placeholder="Paste the target job posting or a job listing URL..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onValueChange={(newValue) => setJobDescription(newValue)}
              onTitleDetected={(title) => setDetectedJobTitle(title || null)}
              fillHeight
            />
          </div>
        </div>

        {/* Primary Action Button Container */}
        <div className="input-container p-6 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          {/* Status chips */}
          {(resume.trim() || jobDescription.trim()) && (
            <div className="flex items-center justify-center gap-3 text-xs sm:text-sm mb-4">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${resume.trim().length >= 100 ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 font-semibold" : "bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800"}`}>
                {resume.trim().length >= 100 ? "✓" : "○"} Resume {resume.trim().length >= 100 ? "Ready" : "(min 100 chars)"}
              </span>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${jobDescription.trim().length >= 100 ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold" : "bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800"}`}>
                {jobDescription.trim().length >= 100 ? "✓" : "○"} Job {jobDescription.trim().length >= 100 ? "Ready" : "(min 100 chars)"}
              </span>
            </div>
          )}

          <div className="text-center space-y-3">
            <TailorButton
              loading={loading}
              onClick={() => {
                analytics.trackEvent(analytics.events.CTA_TAILOR_CLICK, {
                  ...analytics.getTrackingContext({
                    section: "tailorResume",
                    element: "tailor_button",
                    hasResume: !!resume.trim(),
                    hasJobDescription: !!jobDescription.trim(),
                    resumeCharCount: resume.trim().length,
                    jobDescCharCount: jobDescription.trim().length,
                  }),
                  hasUser: !!user,
                });
                handleTailor();
              }}
              disabled={!resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100}
              ready={resume.trim().length >= 100 && jobDescription.trim().length >= 100}
            />
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Analyzes keyword alignment & proposes granular changes you can accept, deny, or adjust.
            </p>
          </div>
        </div>

        {/* Sticky Mobile Floating Action Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-3 px-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">
              {resume.trim().length >= 100 && jobDescription.trim().length >= 100
                ? "✨ Ready to Tailor"
                : `${resume.trim().length < 100 ? "Add Resume" : ""} ${jobDescription.trim().length < 100 ? "Add Job Posting" : ""}`}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className={resume.trim().length >= 100 ? "text-emerald-500 font-bold" : ""}>
                Resume {resume.trim().length >= 100 ? "✓" : "..."}
              </span>
              <span>•</span>
              <span className={jobDescription.trim().length >= 100 ? "text-emerald-500 font-bold" : ""}>
                Job {jobDescription.trim().length >= 100 ? "✓" : "..."}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || !resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100}
            onClick={() => handleTailor()}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 ${
              loading || !resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100
                ? "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-cyan-500/25 active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Tailoring...</span>
              </>
            ) : (
              <span>✨ Tailor Resume</span>
            )}
          </button>
        </div>

        {/* How It Works - below the form */}
        <section id="howItWorks" className="py-6 md:py-8" data-parallax="0.08">
          <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6 md:mb-8">
            How to Optimize Your Resume for ATS and Job Descriptions
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
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Get an ATS-Optimized Resume That Sounds Like You</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive a version that matches the job, sounds human, and keeps your voice</p>
            </div>
          </div>
        </section>

        {error && (
          <div
            key={errorShakeKey}
            className="animate-shake p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30 text-pink-700 dark:text-pink-400" role="alert"
          >
            {error}
          </div>
        )}

        {(resume || jobDescription || results) && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                analytics.trackEvent(analytics.events.RESET_CLICK, {
                  ...analytics.getTrackingContext({ section: "tailorResume", element: "reset", label: "Start over" }),
                  hadResults: !!results,
                  hadResume: !!resume.trim(),
                  hadJobDescription: !!jobDescription.trim(),
                });
                setShowResetModal(true);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              Start over
            </button>
          </div>
        )}

        {(loading || redirecting) && (
          <ProgressStepper
            isActive={true}
            agentMessage={agentMessage}
            agentProgress={agentProgress}
          />
        )}

        {/* Anonymous result: show tailored resume inline and CTA to sign up to save */}
        {!user && hasStartedTailoring && results && !results.resumeId && !loading && (
          <div id="results-section" className="space-y-6 pt-4" data-parallax="0.05">
            <TailoredResumeOutput
              newResume={results.tailoredResume ?? ""}
              originalResume={resume}
              suggestions={results.suggestions || []}
              sectionGroups={results.sectionGroups}
              resumeAST={results.resumeAST}
              onSuggestionsChange={(updated) =>
                setResults((prev) => (prev ? { ...prev, suggestions: updated } : null))
              }
              onSectionGroupsChange={(updatedGroups) =>
                setResults((prev) => (prev ? { ...prev, sectionGroups: updatedGroups } : null))
              }
              isUnlocked={false}
              onUnlockRequest={() => setShowAuthModalMode("signup")}
              beforeScore={results.beforeScore ?? 50}
              matchScore={results.matchScore ?? 85}
              loading={false}
              showDownload={true}
              downloadJobTitle={detectedJobTitle ?? undefined}
            />
            {results.matchScore != null && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Match score: <span className="font-medium text-cyan-600 dark:text-cyan-400">{results.matchScore}</span>
              </p>
            )}
            <div className="flex flex-col items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAuthModalMode("signup")}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 transition-all hover:scale-[1.02]"
              >
                Create free account to save this resume and get 2 more free
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowAuthModalMode("signin")}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  Sign in to save it
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Logged-in: results without resumeId (edge case) — show profile link */}
        {user && hasStartedTailoring && results && !results.resumeId && !loading && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 p-4 text-center text-emerald-800 dark:text-emerald-200" data-parallax="0.05">
            <p className="font-medium">Resume saved.</p>
            <p className="text-sm mt-1">
              <Link
                href="/profile"
                className="underline hover:no-underline"
                onClick={() => {
                  analytics.trackEvent(analytics.events.LINK_CLICK, {
                    ...analytics.getTrackingContext({ section: "results", element: "link", label: "View it in your profile" }),
                    href: "/profile",
                    ...(results && typeof (results as { resumeId?: string }).resumeId === "string" && { resumeId: (results as { resumeId: string }).resumeId }),
                  });
                }}
              >
                View it in your profile
              </Link>
              .
            </p>
          </div>
        )}

        {/* Below-the-fold SEO content */}
        <HomepageSEOSection />

      </ParallaxContainer>

      <AuthModal
        key={showAuthModalMode ?? "auth"}
        isOpen={showAuthModalMode !== null}
        onClose={() => setShowAuthModalMode(null)}
        onSuccess={() => setShowAuthModalMode(null)}
        mode={showAuthModalMode ?? "signup"}
        title={showAuthModalMode === "signin" ? "Sign in to save your resume" : "Create account"}
        description="Your first 3 resumes are free. No credit card required."
      />

      <ResetConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
