"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import TierSelectionModal from "./TierSelectionModal";
import LimitNoticeAlert from "./LimitNoticeAlert";
import { classifyTailorError, type LimitAction } from "@/app/utils/tailorLimitError";
import { containsLockedPlaceholder, selectSafePrefillResume } from "@/app/utils/gatingSanitizer";
import ProgressStepper, { type ProgressActivityEntry } from "./ProgressStepper";
import ResetConfirmationModal from "./ResetConfirmationModal";
import FileDropZone from "./FileDropZone";
import HomepageSEOSection from "./HomepageSEOSection";
import TailoredResumeOutput from "./TailoredResumeOutput";
import TailoringControlsPanel from "./TailoringControlsPanel";
import ElicitationPanel from "./ElicitationPanel";
import TailorBot from "./neo/TailorBot";
import NeoButton from "./neo/NeoButton";
import NeoBadge from "./neo/NeoBadge";
import DesignSwitcher from "./DesignSwitcher";
import { useTheme } from "./ThemeProvider";
import { useGamification } from "@/app/contexts/GamificationContext";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import type { ElicitationFact, ElicitationQuestion } from "@/app/types/elicitation";
import {
  getSavedElicitationAnswers,
  normalizeElicitationKey,
} from "@/app/utils/elicitation";
import { extractTextFromPDF } from "@/app/utils/pdfExtractor";
import { analytics } from "@/app/services/analytics";
import { saveResumeData, loadResumeData, clearResumeData } from "@/app/utils/dataPersistence";
import { TAILORING_PRESET_LABELS } from "@/app/prompts/tailoringPresets";
import { FREE_RESUME_LIMIT, FREE_AUDIT_LIMIT, TIME_BASED_TIERS } from "@/app/config/pricing";
import LaunchOfferBanner from "@/app/components/LaunchOfferBanner";
import type { HumanizeResponse } from "@/app/types/humanize";

export { type HumanizeResponse } from "@/app/types/humanize";

const TAILOR_TIMEOUT_MS = 56_000; // Trigger client abort slightly before 60s Vercel limit

// Entry price for the hero price-anchor. Derived from the single source of truth
// (TIME_BASED_TIERS) so the advertised price can never drift from what Stripe charges.
const ENTRY_PRICE = Math.min(...TIME_BASED_TIERS.map((t) => t.price)).toFixed(2);

async function runHumanizeStream(params: {
  resume: string;
  jobDescription: string;
  sessionId: string | null;
  userId: string | null;
  accessToken?: string;
  jobTitle?: string;
  onProgress?: (progress: number, message: string, tool?: string) => void;
  parentResumeId?: string;
  customInstructions?: string;
  keywordsToWeave?: string[];
  promptPresetIds?: string[];
  preferences: TailoringPreferences;
  elicitationFacts?: ElicitationFact[];
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
    elicitationFacts,
  } = params;

  const controller = new AbortController();
  const totalTimeoutId = setTimeout(() => {
    console.warn("[Tailor Stream] ⚠️ Stream reached total timeout of 56s");
    controller.abort();
  }, TAILOR_TIMEOUT_MS);

  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  const resetWatchdog = () => {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      console.warn("[Tailor Stream] ⚠️ Stream watchdog expired: no chunks received for 26s");
      controller.abort();
    }, 26_000);
  };
  resetWatchdog();

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
        elicitationFacts: elicitationFacts?.length ? elicitationFacts : undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body.message || body.error || "Failed to tailor resume";
      const tailoredError = new Error(msg) as Error & {
        statusCode?: number;
        anonymousLimitExceeded?: boolean;
        requireUpgrade?: boolean;
      };
      tailoredError.statusCode = response.status;
      if (body.anonymousLimitExceeded) tailoredError.anonymousLimitExceeded = true;
      if (body.requireUpgrade) tailoredError.requireUpgrade = true;
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
      resetWatchdog();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("data: ")) {
          const payloadStr = lines[i].slice(6).trim();
          if (!payloadStr) continue;
          let parsed: any;
          try {
            parsed = JSON.parse(payloadStr);
          } catch {
            // Ignore malformed/partial non-JSON SSE data frames rather than crashing the stream
            continue;
          }
          if (parsed.stage || parsed.step || parsed.message) {
            console.log(`[Tailor Stream] ⚡ Progress: ${parsed.progress}% - ${parsed.tool ? `[${parsed.tool}] ` : ""}${parsed.message || parsed.step}`);
          }
          if (parsed.progress !== undefined) {
            onProgress?.(parsed.progress, parsed.message || "", parsed.tool);
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
            if (!completeData) {
              throw new Error(parsed.error);
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
          const payloadStr = line.slice(6).trim();
          if (!payloadStr) continue;
          let parsed: any;
          try {
            parsed = JSON.parse(payloadStr);
          } catch {
            continue;
          }
          if (parsed.tailoredResume) {
            completeData = parsed;
          }
          if (parsed.error && !completeData) {
            throw new Error(parsed.error);
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

    try {
      if (typeof window !== "undefined" && completeData.tailoredResume) {
        localStorage.setItem("airesumetailor_last_result", JSON.stringify({
          resumeId: completeData.resumeId,
          tailoredResume: completeData.tailoredResume,
          matchScore: completeData.matchScore,
          beforeScore: completeData.beforeScore,
          timestamp: Date.now(),
        }));
      }
    } catch {}

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
      isUnlocked: completeData.isUnlocked !== undefined ? completeData.isUnlocked : true,
    };
  } finally {
    clearTimeout(totalTimeoutId);
    if (watchdogTimer) clearTimeout(watchdogTimer);
  }
}

/**
 * Reads the query string on the client WITHOUT using next/navigation's
 * useSearchParams(). A bare useSearchParams() call forces the whole route into a
 * client-side render ("CSR bailout") unless wrapped in <Suspense>, and wrapping the
 * homepage's main content in <Suspense> would strip ALL server-rendered HTML from the
 * homepage — fatal for SEO. These prefill params are optional and only consumed inside
 * effects below, so deferring the read until after mount is not user-visible.
 */
function useClientSearchParams(): URLSearchParams | null {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);
  return params;
}

export default function SplitScreenTailorView() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const prefillResumeId = searchParams?.get("prefillResumeId") ?? null;
  const prefillVersion = searchParams?.get("prefillVersion") ?? null;
  const { user, session } = useAuth();
  const { design } = useTheme();
  const isPom = design === "pomegranate";
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
  const [showTierModal, setShowTierModal] = useState(false);
  const [limitAction, setLimitAction] = useState<LimitAction>(null);
  const [preferences, setPreferences] = useState<TailoringPreferences>(DEFAULT_PREFERENCES);
  const [agentMessage, setAgentMessage] = useState<string>("");
  const [agentProgress, setAgentProgress] = useState<number | undefined>(undefined);
  const [agentTool, setAgentTool] = useState<string | undefined>(undefined);
  const [agentFeed, setAgentFeed] = useState<ProgressActivityEntry[]>([]);

  useEffect(() => {
    if (loading) {
      document.getElementById("progress-stepper")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [loading]);
  const [activeMobileTab, setActiveMobileTab] = useState<"resume" | "job" | "options">("resume");
  const prefillSyncedForRef = useRef<string | null>(null);

  // Guided elicitation ("A few things your resume didn't say").
  const [showElicitation, setShowElicitation] = useState(false);
  const { playSfx, awardXp, completeQuest, pokeMascot } = useGamification();
  const [elicitationQuestions, setElicitationQuestions] = useState<ElicitationQuestion[]>([]);
  const elicitationResolvedRef = useRef(false);
  const elicitationFactsRef = useRef<ElicitationFact[]>([]);
  const hasAwardedDocLoadRef = useRef(false);

  const keywordsToWeaveParam = searchParams?.get("keywordsToWeave") ?? null;
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
      setResume(
        selectSafePrefillResume({
          prefillVersion,
          isUnlocked: prefillData.isUnlocked,
          originalResume: prefillData.originalResume,
          tailoredResume: prefillData.tailoredResume,
        })
      );
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
    let sid: string | null = null;
    try {
      sid = typeof window !== "undefined" ? localStorage.getItem("resume-tailor-session-id") : null;
    } catch {
      sid = null;
    }
    if (!sid) {
      // This id acts as a bearer token for anonymous resume access, so it must be
      // unguessable. The previous value embedded Date.now() (fully predictable)
      // and Math.random() (not a CSPRNG); randomUUID() gives 122 bits.
      const uuid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sid = `session-${uuid}`;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("resume-tailor-session-id", sid);
        }
      } catch {
        // Ignore storage errors in private browsing / blocked storage
      }
    }
    setSessionId(sid);

    const stored = loadResumeData();
    if (stored) {
      if (stored.resumeText && !containsLockedPlaceholder(stored.resumeText)) {
        setResume(stored.resumeText);
      }
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

    const recordAgentStep = (progress: number, message: string, tool?: string) => {
      setAgentProgress(progress);
      if (tool) setAgentTool(tool);
      if (message) setAgentMessage(message);
      if (!message && !tool) return;
      setAgentFeed((prev) => {
        const last = prev[prev.length - 1];
        const resolvedMessage = message || (tool ? `Running ${tool}...` : "");
        const resolvedTool = tool || last?.tool;
        if (last && last.message === resolvedMessage && last.tool === resolvedTool) {
          return prev;
        }
        return [...prev, { tool: resolvedTool, message: resolvedMessage, progress }];
      });
    };

    // 1. Immediately indicate loading state on the button so 1 click suffices
    setLoading(true);
    setError(null);
    setLimitAction(null);
    setResults(null);
    setHasStartedTailoring(true);
    setAgentFeed([]);
    recordAgentStep(5, "Checking requirements...", "Requirements Check");
    playSfx("click");

    // Guided elicitation: ask 3-5 plain questions ONCE, after the job is known and
    // before tailoring, so we can surface true specifics the resume omitted.
    // If the candidate already answered these questions in a previous session,
    // we repopulate the answers and avoid re-asking them (instant 1-click tailoring!).
    if (!elicitationResolvedRef.current) {
      elicitationResolvedRef.current = true;
      try {
        const res = await fetch("/api/elicitation/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume: resume.trim(),
            jobDescription: jobDescription.trim(),
            jobTitle: detectedJobTitle ?? jobTitleFromHook ?? undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        const questions: ElicitationQuestion[] = Array.isArray(data?.questions)
          ? data.questions
          : [];

        if (questions.length > 0) {
          const savedAnswers = getSavedElicitationAnswers();
          const rememberedFacts: ElicitationFact[] = [];
          let allAnswered = true;

          for (const q of questions) {
            const key = normalizeElicitationKey(q.question);
            const answer = savedAnswers[key];
            if (answer && answer.trim().length > 0) {
              rememberedFacts.push({ question: q.question, answer: answer.trim() });
            } else {
              allAnswered = false;
            }
          }

          if (allAnswered && rememberedFacts.length > 0) {
            // All questions already answered previously — inject facts and continue with 0 delay!
            elicitationFactsRef.current = rememberedFacts;
          } else {
            // Unanswered questions exist — open modal with known answers pre-populated
            setLoading(false);
            setAgentTool(undefined);
            setElicitationQuestions(questions);
            setShowElicitation(true);
            return; // wait for the user to answer or skip, then resume tailoring
          }
        }
      } catch {
        // Couldn't get questions — never block the user; tailor as usual.
      }
    }

    recordAgentStep(10, "Analyzing your resume and target job requirements...", "Tailoring Pipeline");

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
        onProgress: recordAgentStep,
        parentResumeId,
        customInstructions: customInstructions.trim() || undefined,
        keywordsToWeave: keywordsToWeave.length ? keywordsToWeave : undefined,
        promptPresetIds: promptPresetIds.length ? promptPresetIds : undefined,
        preferences,
        elicitationFacts: elicitationFactsRef.current.length ? elicitationFactsRef.current : undefined,
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

      playSfx("success");
      const tailorDedupeKey = `tailored_resume_${data.resumeId || "session"}`;
      awardXp(150, "tailored_resume", tailorDedupeKey);
      completeQuest("tailor_boost");

      if (data.resumeId) {
        didRedirect = true;
        setRedirecting(true);
        router.push(`/resume/${data.resumeId}`);
      } else {
        setResults(data);
      }
    } catch (err) {
      playSfx("alert");
      const rawMessage = err instanceof Error ? err.message : "An error occurred";
      const statusCode = (err as Error & { statusCode?: number }).statusCode;
      const classified = classifyTailorError(err);

      const userMessage = classified.message;
      const errorType = classified.errorType;
      setLimitAction(classified.limitAction);
      if (classified.openUpgradeModal) setShowTierModal(true);
      if (classified.openAuthModal) setShowAuthModalMode("signup");

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
  }, [resume, jobDescription, sessionId, user, session, router, prefillResumeId, detectedJobTitle, jobTitleFromHook, parentResumeId, customInstructions, keywordsToWeave, promptPresetIds, preferences]);

  // Resume tailoring after the elicitation screen: carry the user's own words into
  // the pipeline as user-supplied facts (empty when skipped -> behaves as today).
  const handleElicitationComplete = useCallback(
    (facts: ElicitationFact[]) => {
      elicitationFactsRef.current = facts;
      setShowElicitation(false);
      void handleTailor();
    },
    [handleTailor]
  );

  const handleElicitationSkipAll = useCallback(() => {
    elicitationFactsRef.current = [];
    setShowElicitation(false);
    void handleTailor();
  }, [handleTailor]);

  const handleReset = useCallback(() => {
    setResume("");
    setJobDescription("");
    setResults(null);
    setError(null);
    setHasStartedTailoring(false);
    // Allow the elicitation questions to be asked again for the next resume.
    elicitationResolvedRef.current = false;
    elicitationFactsRef.current = [];
    setShowElicitation(false);
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
    if (text.trim().length >= 100) {
      playSfx("success");
      if (!hasAwardedDocLoadRef.current) {
        hasAwardedDocLoadRef.current = true;
        awardXp(20, "Resume Document Loaded", "resume_doc_loaded");
      }
    }
  }, [playSfx, awardXp]);

  const handleFileError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <>
      <ParallaxBackground />
      <ParallaxContainer className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 max-w-6xl space-y-8 md:space-y-12">
        {user && (
          <LaunchOfferBanner
            userCreatedAt={user.created_at}
            className="mt-2"
          />
        )}
        {/* Dual-Design Calm Hero (Pomegranate Tactile & Warm Paper Risograph) */}
        <section className="py-4 md:py-6">
          <div
            className={`rounded-[28px] overflow-hidden transition-all ${
              isPom
                ? "bg-white border-[2px] border-[#3A0C22] shadow-[0_5px_0_#3A0C22]"
                : "bg-[#FFFDF8] border border-[#241F1A]/12 shadow-[5px_5px_0_rgba(43,107,90,0.14)]"
            }`}
          >
            {/* Top Cream / Editorial Strip */}
            <div
              className={`px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-2 border-b ${
                isPom
                  ? "bg-[#F6F1E4] border-[#3A0C22]/15"
                  : "bg-[#EFE8DA]/55 border-[#241F1A]/10"
              }`}
            >
              <span
                className={`text-xs font-bold flex items-center gap-2 ${
                  isPom ? "text-[#3A0C22]" : "font-mono uppercase tracking-[0.14em] text-[#D65A38] text-[11px]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPom ? "bg-[#EA375D]" : "bg-[#2B6B5A]"
                  }`}
                  aria-hidden="true"
                />
                <span>ATS Match &amp; AI Experience Studio</span>
              </span>
              <div className="flex items-center gap-2 lg:hidden">
                <span className="text-[11px] font-semibold text-[var(--design-ink-muted)] hidden sm:inline">
                  Theme:
                </span>
                <DesignSwitcher variant="compact" />
              </div>
            </div>

            <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-left space-y-4">
                <h1
                  className={`font-bold text-3xl sm:text-4xl md:text-5xl leading-[1.12] tracking-tight text-[var(--design-ink)] ${
                    isPom ? "font-pom-display" : "font-riso-serif"
                  }`}
                >
                  Tailor your resume to any job —{" "}
                  {isPom ? (
                    <span className="inline-block px-3 py-0.5 rounded-full bg-[#F7B93E] text-[#3A0C22] border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22]">
                      in seconds.
                    </span>
                  ) : (
                    <span className="italic text-[#2B6B5A]">in seconds.</span>
                  )}
                </h1>

                <p className="text-sm sm:text-base text-[var(--design-ink-muted)] max-w-xl leading-relaxed font-medium">
                  No filler, no walls of text. Keep your exact 1-page fit, sharpen real impact with X-Y-Z metrics, and watch your ATS score jump live.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx("click");
                      analytics.trackEvent(analytics.events.CLICK, {
                        ...analytics.getTrackingContext({ section: "hero", element: "hero_cta", label: "Get Started" }),
                        destination: "#tailorResume",
                      });
                      scrollToSection("tailorResume");
                    }}
                    className={`neo-btn px-6 py-3 text-sm font-extrabold flex items-center gap-2 ${
                      isPom
                        ? "bg-[#EA375D] hover:bg-[#C9224A] text-white"
                        : "bg-[#2B6B5A] hover:bg-[#225648] text-[#FFFDF8]"
                    }`}
                  >
                    <span>Start Free Tailor →</span>
                  </button>
                  <Link
                    href="/futureproof"
                    onClick={() => playSfx("click")}
                    className={`px-5 py-3 rounded-full text-sm font-bold transition-colors border ${
                      isPom
                        ? "bg-[#F6F1E4] hover:bg-[#FFFDF5] text-[#3A0C22] border-[1.75px] border-[#3A0C22]"
                        : "bg-[#FAEAE4] hover:bg-[#f6ddd4] text-[#B94726] border-[#D65A38]/25"
                    }`}
                  >
                    Add AI Skills
                  </Link>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[var(--design-ink-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[var(--design-success)] font-bold">✓</span>
                    {FREE_RESUME_LIMIT > 0 ? `First ${FREE_RESUME_LIMIT} free` : "Free ATS audit & diff"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[var(--design-success)] font-bold">✓</span>
                    Strict ≤2-line bullet fit
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[var(--design-success)] font-bold">✓</span>
                    One-time pass from ${ENTRY_PRICE}
                  </span>
                </div>
              </div>

              {/* Right: Signature Overlapping Score Pill + TailorBot Medallion */}
              <div className="shrink-0 w-full md:w-[300px] flex flex-col items-center gap-3">
                {isPom ? (
                  <div className="w-full bg-white border-[2px] border-[#3A0C22] rounded-full p-1.5 flex items-center justify-between shadow-[0_4px_0_#3A0C22]">
                    <div className="flex-1 bg-[#F6F1E4] rounded-l-full py-2.5 pl-3 pr-1 text-center">
                      <div className="text-xl font-extrabold leading-none text-[#3A0C22]">58%</div>
                      <div className="text-[10px] font-bold text-[#7D4D61] mt-0.5">Before</div>
                    </div>
                    <div className="w-[74px] h-[74px] -my-4 -mx-1 rounded-full bg-[#EA375D] border-[2px] border-[#3A0C22] shadow-[0_4px_0_#3A0C22] flex items-center justify-center shrink-0 z-10">
                      <div className="w-[58px] h-[58px] rounded-full bg-[#FFFDF5] border-[1.5px] border-[#3A0C22] flex items-center justify-center">
                        <TailorBot state="celebrating" size={44} onPoke={() => pokeMascot()} />
                      </div>
                    </div>
                    <div className="flex-1 bg-[#F6F1E4] rounded-r-full py-2.5 pr-3 pl-1 text-center">
                      <div className="text-xl font-extrabold leading-none text-[#128C66]">92%</div>
                      <div className="text-[10px] font-bold text-[#7D4D61] mt-0.5">After</div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-[24px] bg-[#F6F0E4] border border-[#241F1A]/12 p-5 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#FAEAE4] border border-[#D65A38]/25 flex items-center justify-center">
                        <TailorBot state="celebrating" size={48} onPoke={() => pokeMascot()} />
                      </div>
                    </div>
                    <p className="font-riso-serif text-xl font-bold text-[#241F1A] leading-snug">
                      Avg. lift{" "}
                      <span className="text-[#8C7B6B]">58%</span> →{" "}
                      <span className="italic text-[#2B6B5A]">92%</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 w-full">
                  {[
                    { k: "X-Y-Z", sub: "Metrics", pomBg: "#FFF3D6", risoBg: "#E5EFEA" },
                    { k: "15s", sub: "Tailor", pomBg: "#E6F4FF", risoBg: "#FAEAE4" },
                    { k: "Zero", sub: "Sub Traps", pomBg: "#E6F7EF", risoBg: "#FBF1DA" },
                  ].map((pill) => (
                    <div
                      key={pill.k}
                      className={`rounded-2xl py-2 px-2 text-center border ${
                        isPom ? "border-[#3A0C22]/20" : "border-[#241F1A]/10"
                      }`}
                      style={{ backgroundColor: isPom ? pill.pomBg : pill.risoBg }}
                    >
                      <div className="text-xs font-extrabold text-[var(--design-ink)]">
                        {pill.k}
                      </div>
                      <div className="text-[10px] font-semibold text-[var(--design-ink-muted)]">
                        {pill.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
        <div className="md:hidden flex items-center justify-between p-1.5 mb-6 rounded-xl bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] gap-2">
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              setActiveMobileTab("resume");
            }}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all neo-btn ${
              activeMobileTab === "resume"
                ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
                : "bg-white text-[#1C2028] border border-[#1C2028]/40"
            }`}
          >
            <span>📄 1. YOUR RESUME</span>
            {resume.trim().length >= 100 ? (
              <span className="w-2 h-2 rounded-full bg-[#10B981] border border-[#1C2028]" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              setActiveMobileTab("job");
            }}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all neo-btn ${
              activeMobileTab === "job"
                ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
                : "bg-white text-[#1C2028] border border-[#1C2028]/40"
            }`}
          >
            <span>💼 2. TARGET JOB</span>
            {jobDescription.trim().length >= 100 ? (
              <span className="w-2 h-2 rounded-full bg-[#10B981] border border-[#1C2028]" />
            ) : null}
          </button>
        </div>

        {/* Input Section - Side by side on desktop, active tab on mobile */}
        <div id="tailorResume" className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 md:items-stretch mb-8">
          {/* Resume Column */}
          <div className={`flex flex-col min-h-[460px] md:min-h-[520px] md:h-full ${activeMobileTab === "resume" || "hidden md:flex"}`}>
            <ResumeInput
              label="Your Resume"
              placeholder="Paste your current resume bullet points, experience, and skills here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              fileDropComponent={
                <FileDropZone
                  key={fileDropKey}
                  onFileAccepted={handleFileAccepted}
                  onError={handleFileError}
                  accept=".pdf,.txt"
                  extractText={extractTextForFile}
                />
              }
            />
          </div>

          {/* Job Description Column */}
          <div className={`flex flex-col min-h-[460px] md:min-h-[520px] md:h-full ${activeMobileTab === "job" || "hidden md:flex"}`}>
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
        <div className="input-container p-6 sm:p-8 neo-box bg-[#F4F1EA] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] space-y-5">
          {/* Status chips */}
          {(resume.trim() || jobDescription.trim()) && (
            <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-mono flex-wrap">
              <span className={`neo-tag px-3 py-1 text-xs font-bold ${
                resume.trim().length >= 100 
                  ? "bg-[#10B981] text-white" 
                  : "bg-white text-gray-600"
              }`}>
                {resume.trim().length >= 100 ? "✓ RESUME READY" : "○ RESUME (MIN 100 CHARS)"}
              </span>
              <span className={`neo-tag px-3 py-1 text-xs font-bold ${
                jobDescription.trim().length >= 100 
                  ? "bg-[#10B981] text-white" 
                  : "bg-white text-gray-600"
              }`}>
                {jobDescription.trim().length >= 100 ? "✓ JOB READY" : "○ JOB (MIN 100 CHARS)"}
              </span>
            </div>
          )}

          {error && (
            <LimitNoticeAlert
              key={`action-error-${errorShakeKey}`}
              message={error}
              limitAction={limitAction}
              entryPrice={ENTRY_PRICE}
              onOpenUpgrade={() => {
                playSfx("click");
                setShowTierModal(true);
              }}
              onOpenAuth={() => {
                playSfx("click");
                setShowAuthModalMode("signup");
              }}
            />
          )}

          <div className="text-center space-y-3">
            <TailorButton
              loading={loading}
              statusText={agentTool ? `${agentTool}...` : undefined}
              onClick={() => {
                playSfx("click");
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
            <p className="text-xs sm:text-sm font-mono text-gray-600">
              Analyzes keyword alignment & proposes granular changes you can accept, deny, or adjust.
            </p>
          </div>
        </div>

        {(loading || redirecting) && (
          <div id="progress-stepper">
            <ProgressStepper
              isActive={true}
              agentMessage={agentMessage}
              agentProgress={agentProgress}
              activeTool={agentTool}
              activityLog={agentFeed}
            />
          </div>
        )}

        {/* Sticky Mobile Floating Action Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F0] border-t-2 border-[#1C2028] p-3 px-4 shadow-[0px_-4px_0px_rgba(28,32,40,0.15)] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-[#1C2028]">
              {resume.trim().length >= 100 && jobDescription.trim().length >= 100
                ? "⚡ READY TO TAILOR"
                : `${resume.trim().length < 100 ? "ADD RESUME" : ""} ${jobDescription.trim().length < 100 ? "ADD JOB POSTING" : ""}`}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-600">
              <span className={resume.trim().length >= 100 ? "text-[#10B981] font-bold" : ""}>
                Resume {resume.trim().length >= 100 ? "✓" : "..."}
              </span>
              <span>•</span>
              <span className={jobDescription.trim().length >= 100 ? "text-[#10B981] font-bold" : ""}>
                Job {jobDescription.trim().length >= 100 ? "✓" : "..."}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || !resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100}
            onClick={() => {
              playSfx("click");
              handleTailor();
            }}
            className={`neo-btn px-4 py-2 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
              loading || !resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100
                ? "bg-[#E5E0D8] text-gray-400 border border-gray-400 cursor-not-allowed shadow-none"
                : "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px]"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{agentTool ? `${agentTool}...` : "Tailoring..."}</span>
              </>
            ) : (
              <span>⚡ TAILOR RESUME</span>
            )}
          </button>
        </div>

        {/* How It Works - below the form */}
        <section id="howItWorks" className="py-6 md:py-8">
          <h2 className="text-xl md:text-2xl font-mono font-bold text-center text-[#1C2028] dark:text-[#FAF7F0] mb-6 md:mb-8 uppercase tracking-wide">
            How to Optimize Your Resume for ATS and Job Descriptions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center p-4 rounded-xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#FF5722] text-white flex items-center justify-center font-mono font-bold text-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]">1</div>
              <h3 className="font-mono font-bold text-sm sm:text-base text-[#1C2028] dark:text-[#FAF7F0] mb-2 uppercase">Add your resume</h3>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">Upload a PDF or paste your resume text</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center font-mono font-bold text-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]">2</div>
              <h3 className="font-mono font-bold text-sm sm:text-base text-[#1C2028] dark:text-[#FAF7F0] mb-2 uppercase">Paste the job posting</h3>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">Copy the job description you&apos;re applying for</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#10B981] text-white flex items-center justify-center font-mono font-bold text-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]">3</div>
              <h3 className="font-mono font-bold text-sm sm:text-base text-[#1C2028] dark:text-[#FAF7F0] mb-2 uppercase">Get ATS-Optimized Bullets</h3>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">Receive a tailored version that matches the job, sounds human, and keeps your voice</p>
            </div>
          </div>
        </section>

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
              className="neo-btn px-4 py-2 text-xs font-mono font-bold rounded-lg border-2 border-[#1C2028] text-[#1C2028] dark:text-[#FAF7F0] bg-[#FAF7F0] dark:bg-[#21262D] hover:bg-[#FFE0B2] shadow-[2px_2px_0px_#1C2028] transition-colors"
            >
              START OVER
            </button>
          </div>
        )}

        {/* Anonymous result: show tailored resume inline and CTA to sign up to save */}
        {!user && hasStartedTailoring && results && !results.resumeId && !loading && (
          <div id="results-section" className="space-y-6 pt-4">
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
              isUnlocked={results.isUnlocked !== undefined ? results.isUnlocked : true}
              onUnlockRequest={() => setShowAuthModalMode("signup")}
              beforeScore={results.beforeScore ?? 50}
              matchScore={results.matchScore ?? 85}
              loading={false}
              showDownload={true}
              downloadJobTitle={detectedJobTitle ?? undefined}
            />
            {results.matchScore != null && (
              <p className="text-sm font-mono text-[#1C2028] flex flex-wrap items-center gap-2">
                <span>MATCH SCORE:</span>
                {results.beforeScore != null && (
                  <>
                    <span className="px-2.5 py-0.5 rounded font-mono font-bold bg-[#F4F1EA] text-[#374151] border border-[#1C2028]">
                      Before: {results.beforeScore}%
                    </span>
                    <span className="text-[#FF5722] font-bold" aria-hidden="true">→</span>
                  </>
                )}
                <span className="neo-tag px-2.5 py-0.5 rounded font-mono font-bold bg-[#10B981] text-white border border-[#1C2028]">
                  Potential: {results.matchScore}%
                </span>
              </p>
            )}
            <div className="flex flex-col items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAuthModalMode("signup")}
                className="neo-btn px-6 py-3.5 rounded-xl font-mono font-bold text-sm bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] hover:bg-[#F4511E] transition-all"
              >
                ⚡ CREATE FREE ACCOUNT TO SAVE &amp; GET 2 FREE AUDITS
              </button>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowAuthModalMode("signin")}
                  className="text-[#FF5722] hover:underline font-bold"
                >
                  Sign in to save it
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Logged-in: results without resumeId (edge case) — show profile link */}
        {user && hasStartedTailoring && results && !results.resumeId && !loading && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 p-4 text-center text-emerald-800 dark:text-emerald-200">
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
        description={
          FREE_RESUME_LIMIT > 0
            ? `Your first ${FREE_RESUME_LIMIT} resume is free. No credit card required.`
            : `Get ${FREE_AUDIT_LIMIT} free ATS audits & diff previews. No credit card required.`
        }
      />

      <ResetConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />

      <ElicitationPanel
        isOpen={showElicitation}
        questions={elicitationQuestions}
        jobTitle={detectedJobTitle ?? jobTitleFromHook ?? null}
        onComplete={handleElicitationComplete}
        onSkipAll={handleElicitationSkipAll}
      />

      <TierSelectionModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
      />
    </>
  );
}
