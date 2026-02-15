"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import ParallaxBackground from "./ParallaxBackground";
import ParallaxContainer from "./ParallaxContainer";
import ResumeInput from "./ResumeInput";
import JobDescriptionInput from "./JobDescriptionInput";
import TailorButton from "./TailorButton";
import AuthGate from "./AuthGate";
import ProgressStepper from "./ProgressStepper";
import ResetConfirmationModal from "./ResetConfirmationModal";
import FileDropZone from "./FileDropZone";
import HomepageSEOSection from "./HomepageSEOSection";
import { extractTextFromPDF } from "@/app/utils/pdfExtractor";
import { analytics } from "@/app/services/analytics";
import { saveResumeData, loadResumeData, clearResumeData } from "@/app/utils/dataPersistence";
import type { HumanizeResponse } from "@/app/types/humanize";

export { type HumanizeResponse } from "@/app/types/humanize";

const TAILOR_TIMEOUT_MS = 62_000; // Slightly over 60s maxDuration to detect timeout

async function runHumanizeStream(params: {
  resume: string;
  jobDescription: string;
  sessionId: string | null;
  userId: string | null;
  jobTitle?: string;
  onProgress?: (progress: number, message: string) => void;
}): Promise<HumanizeResponse> {
  const { resume, jobDescription, sessionId, userId, jobTitle, onProgress } = params;

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
        jobTitle: jobTitle ?? undefined,
      }),
      signal: controller.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.message || err.error || "Failed to tailor resume";
      const tailoredError = new Error(msg) as Error & { statusCode?: number };
      tailoredError.statusCode = response.status;
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
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
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
  const [detectedJobTitle, setDetectedJobTitle] = useState<string | null>(null);

  const ROTATING_WORDS = [
    "hours",
    "days",
    "weekends",
    "nights",
    "energy",
    "stress",
    "time",
    "effort",
  ];
  const [typingWordIndex, setTypingWordIndex] = useState(0);
  const [typingCharIndex, setTypingCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const word = ROTATING_WORDS[typingWordIndex];
    const delay = isDeleting ? 60 : 100;

    if (isDeleting) {
      if (typingCharIndex === 0) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsDeleting(false);
          setTypingWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        }, 300);
      } else {
        typingTimeoutRef.current = setTimeout(
          () => setTypingCharIndex((c) => c - 1),
          delay
        );
      }
    } else {
      if (typingCharIndex < word.length) {
        typingTimeoutRef.current = setTimeout(
          () => setTypingCharIndex((c) => c + 1),
          delay
        );
      } else {
        typingTimeoutRef.current = setTimeout(() => setIsDeleting(true), 2200);
      }
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [typingWordIndex, typingCharIndex, isDeleting]);

  const displayedWord = ROTATING_WORDS[typingWordIndex].slice(0, typingCharIndex);

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
    if (!user) {
      // Defense in depth: should not reach here when unauthenticated (AuthGate uses render prop)
      return;
    }
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
      const rawMessage = err instanceof Error ? err.message : "An error occurred";
      const isAbort = err instanceof Error && err.name === "AbortError";
      const isNetwork =
        err instanceof TypeError && (
          rawMessage.includes("fetch") ||
          rawMessage.includes("network") ||
          rawMessage.includes("Failed to fetch")
        );
      const statusCode = (err as Error & { statusCode?: number }).statusCode;

      let userMessage = rawMessage;
      let errorType = "unknown";
      if (isAbort) {
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
        error: rawMessage,
        errorType,
        statusCode: statusCode ?? null,
        timestamp: new Date().toISOString(),
      });
    } finally {
      if (!didRedirect) setLoading(false);
    }
  }, [resume, jobDescription, sessionId, user, router]);

  const handleReset = useCallback(() => {
    setResume("");
    setJobDescription("");
    setResults(null);
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

  return (
    <>
      <ParallaxBackground />
      <ParallaxContainer className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 max-w-6xl space-y-8 md:space-y-12">
        {/* Hero */}
        <section className="py-8 md:py-16 text-center" data-parallax="0.05">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">
            Free AI Resume Tailor: Optimize Your Resume for Any Job Posting
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-2 italic">
            Still unmistakably you—just refined.
          </p>
          <p className="text-[22px] sm:text-[24px] text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Your resume tailored to each role. Reads like you spent{" "}
            <span className="inline-block min-w-[6.5rem] text-left">
              <span className="bg-gradient-to-r from-cyan-500 to-purple-500 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent font-medium">
                {displayedWord}
              </span>
              <span className="inline-block w-[2px] h-[1em] ml-0.5 -mb-0.5 bg-cyan-500 dark:bg-cyan-400 animate-pulse" aria-hidden />
            </span>
            {" "}
            <br />
            —without the hassle.
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

        {/* Tailor Action */}
        <div className="input-container p-0 overflow-hidden">
          <div className="p-5 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              Resume (min 100 chars) and Job Description (min 100 chars) required
            </p>

            <div className="text-center space-y-3">
              <AuthGate action="tailor" sessionId={sessionId ?? undefined}>
                {(showAuthModal) => (
                  <TailorButton
                    loading={loading}
                    onClick={user ? handleTailor : showAuthModal}
                    disabled={!resume.trim() || !jobDescription.trim() || resume.trim().length < 100 || jobDescription.trim().length < 100}
                    ready={resume.trim().length >= 100 && jobDescription.trim().length >= 100}
                  />
                )}
              </AuthGate>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get a resume that sounds like you—human, not robotic
              </p>
            </div>
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

        {(resume || jobDescription || results) && (
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

        {/* Results only on /resume/[id]. If no resumeId, show profile link. */}
        {hasStartedTailoring && results && !results.resumeId && !loading && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 p-4 text-center text-emerald-800 dark:text-emerald-200" data-parallax="0.05">
            <p className="font-medium">Resume saved.</p>
            <p className="text-sm mt-1">
              <Link href="/profile" className="underline hover:no-underline">View it in your profile</Link>.
            </p>
          </div>
        )}

        {/* Below-the-fold SEO content */}
        <HomepageSEOSection />

      </ParallaxContainer>

      <ResetConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
