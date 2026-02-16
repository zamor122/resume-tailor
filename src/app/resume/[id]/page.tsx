"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import TailoredResumeOutput from "@/app/components/TailoredResumeOutput";
import ImprovementHighlights from "@/app/components/ImprovementHighlights";
import PaymentGate from "@/app/components/PaymentGate";
import FreeReveal from "@/app/components/FreeReveal";
import TierSelectionModal from "@/app/components/TierSelectionModal";
import ShareResumeCard from "@/app/components/ShareResumeCard";
import Link from "next/link";
import type { ResumeMetricsSnapshot } from "@/app/types/humanize";

interface ResumeData {
  originalResume: string;
  tailoredResume: string;
  obfuscatedResume: string;
  contentMap?: Record<string, string> | null;
  jobDescription?: string;
  jobTitle?: string | null;
  matchScore?: number;
  metrics?: ResumeMetricsSnapshot;
  improvementMetrics?: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
  };
  freeReveal?: { section: string; originalText: string; improvedText: string } | null;
  resumeId?: string;
  isUnlocked: boolean;
  accessInfo?: {
    tier: string;
    tierLabel: string;
    expiresAt: string | null;
    remainingTime: number | null;
    isExpired: boolean;
  } | null;
}

export default function ResumeDetailPage() {
  const params = useParams();
  const { user, session, loading: authLoading } = useAuth();
  const id = params?.id as string | undefined;

  const [data, setData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Invalid resume ID");
      setLoading(false);
      return;
    }

    const fetchResume = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/resume/retrieve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeId: id,
            userId: user?.id ?? undefined,
            accessToken: session?.access_token,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || "Failed to load resume");
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error("Failed to load resume");
        }

        setData({
          originalResume: json.originalResume ?? "",
          tailoredResume: json.tailoredResume ?? "",
          obfuscatedResume: json.obfuscatedResume ?? "",
          contentMap: json.contentMap,
          jobDescription: json.jobDescription,
          jobTitle: json.jobTitle ?? null,
          matchScore: typeof json.matchScore === "number" ? json.matchScore : 0,
          metrics: json.metrics ?? undefined,
          improvementMetrics: json.improvementMetrics ?? {},
          freeReveal: json.freeReveal ?? null,
          resumeId: json.resumeId ?? id,
          isUnlocked: json.isUnlocked ?? false,
          accessInfo: json.accessInfo ?? null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resume");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchResume();
    }
  }, [id, user?.id, authLoading]);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">Invalid resume ID</p>
        <Link href="/" className="mt-4 inline-block text-cyan-500 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="p-6 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30">
          <p className="text-pink-700 dark:text-pink-400">{error || "Resume not found"}</p>
          <Link href="/" className="mt-4 inline-block text-cyan-500 hover:underline">
            Back to home
          </Link>
          <Link href="/profile" className="mt-4 ml-4 inline-block text-cyan-500 hover:underline">
            View all resumes
          </Link>
        </div>
      </div>
    );
  }

  const displayResume = data.isUnlocked ? data.tailoredResume : data.obfuscatedResume;
  const matchScore = data.matchScore ?? 0;
  const metrics = {
    ...data.improvementMetrics,
    matchScore,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/profile"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400"
        >
          ← Back to resumes
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400"
        >
          Tailor another resume
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6 min-w-0">
          <div className="output-container">
            <h2 className="text-2xl font-semibold mb-4 gradient-text-emerald">Your Tailored Resume</h2>
            <PaymentGate resumeId={data.resumeId} onUnlock={() => {}} isUnlocked={data.isUnlocked}>
              {data.freeReveal && !data.isUnlocked && (
                <FreeReveal
                  section={data.freeReveal.section}
                  originalText={data.freeReveal.originalText}
                  improvedText={data.freeReveal.improvedText}
                />
              )}
              <TailoredResumeOutput
                newResume={displayResume}
                loading={false}
                showDownload={data.isUnlocked}
                downloadJobTitle={data.jobTitle ?? undefined}
              />
            </PaymentGate>
          </div>
        </div>
        <div className="md:col-span-4 space-y-6">
          <div className="output-container p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Job Match Strength
            </h3>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Job Match</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {matchScore}%
                </p>
              </div>
            </div>
            {data.metrics && (
              <div className="mt-4 space-y-2 text-sm">
                {data.metrics.jdCoverage && data.metrics.jdCoverage.total > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>JD coverage</span>
                    <span>{data.metrics.jdCoverage.percentage}%</span>
                  </div>
                )}
                {data.metrics.criticalKeywords && data.metrics.criticalKeywords.total > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Critical keywords</span>
                    <span>{data.metrics.criticalKeywords.matched}/{data.metrics.criticalKeywords.total}</span>
                  </div>
                )}
                {data.metrics.concreteEvidence && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Concrete evidence</span>
                    <span>{data.metrics.concreteEvidence.percentage}%</span>
                  </div>
                )}
                {typeof data.metrics.platformOwnership === "number" && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Platform signals</span>
                    <span>{data.metrics.platformOwnership}</span>
                  </div>
                )}
                {data.metrics.skimSuccess && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Skim success</span>
                    <span>{data.metrics.skimSuccess.percentage}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!data.isUnlocked && (
            <div className="output-container p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unlock your tailored resume
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose an access plan to view and download your optimized resume.
              </p>
              <button
                onClick={() => setShowTierModal(true)}
                className="w-full py-2 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                Choose Access Plan
              </button>
            </div>
          )}

          <div className="improvement-container">
            <h3 className="text-lg font-semibold mb-3 text-amber-600 dark:text-amber-400">
              Improvement Summary
            </h3>
            <ImprovementHighlights
              metrics={metrics}
              metricsSnapshot={data.metrics ?? null}
            />
          </div>

          {data.isUnlocked && (
            <ShareResumeCard />
          )}
        </div>
      </div>

      <TierSelectionModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        resumeId={data.resumeId}
      />
    </div>
  );
}
