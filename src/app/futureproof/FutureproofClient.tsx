"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/app/lib/supabase/client";
import TierSelectionModal from "@/app/components/TierSelectionModal";
import { extractTextFromPDF, isPDFFile } from "@/app/utils/pdfExtractor";
import {
  DEFAULT_FUTUREPROOF_VARIANT,
  getFutureproofVariant,
  type FutureproofHeroVariant,
} from "@/app/config/futureproofVariants";
import type { ComfortLevel } from "@/app/config/aiToolRegistry";
import type {
  FutureproofAnalyzeResponse,
  FutureproofGenerateResponse,
} from "@/app/utils/futureproofSanitizer";

type Step = 1 | 2 | 3;
type ResultTab = "changes" | "interview" | "export";

/**
 * Highlights the exact newly added AI phrase inside an upgraded bullet so a non-technical
 * reader can see what changed in under 1 second without mentally comparing two paragraphs.
 */
function HighlightedBullet({
  text,
  highlight,
  fallbackToolName,
}: {
  text: string;
  highlight?: string;
  fallbackToolName: string;
}) {
  const phrase =
    highlight && text.toLowerCase().includes(highlight.toLowerCase())
      ? highlight
      : text.toLowerCase().includes(fallbackToolName.toLowerCase())
        ? fallbackToolName
        : null;

  if (!phrase) {
    return <span>{text}</span>;
  }

  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + phrase.length);
  const after = text.slice(idx + phrase.length);

  return (
    <span>
      {before}
      <mark className="bg-[#D1FAE5] text-[#065F46] font-semibold px-1 py-0.5 rounded border border-[#10B981]/50">
        {match}
      </mark>
      {after}
    </span>
  );
}

export default function FutureproofClient({
  initialRole,
}: {
  initialRole?: string;
} = {}) {
  const { user, session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [heroVariant, setHeroVariant] = useState<FutureproofHeroVariant>(() =>
    getFutureproofVariant(initialRole)
  );
  const [step, setStep] = useState<Step>(1);
  const [resumeText, setResumeText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [comfortLevel, setComfortLevel] = useState<ComfortLevel>("everyday");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<FutureproofAnalyzeResponse | null>(null);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [expandedToolDetails, setExpandedToolDetails] = useState<Record<string, boolean>>({});
  const [usedAutoStandard, setUsedAutoStandard] = useState(false);

  const [result, setResult] = useState<FutureproofGenerateResponse | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("changes");
  const [expandedOriginals, setExpandedOriginals] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openTalkingPointId, setOpenTalkingPointId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Lightweight email lead capture (registers lead in Supabase Auth -> feeds daily drip cron)
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role") || params.get("v");
    if (roleParam) {
      setHeroVariant(getFutureproofVariant(roleParam));
    }
  }, []);

  const handleLeadCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = leadEmail.trim();
    if (!cleaned || !cleaned.includes("@")) return;
    setLeadStatus("sending");
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/futureproof`
          : undefined;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleaned,
        options: { emailRedirectTo: redirectTo },
      });
      if (otpError) {
        setLeadStatus("error");
      } else {
        setLeadStatus("sent");
      }
    } catch {
      setLeadStatus("error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      if (isPDFFile(file)) {
        const extracted = await extractTextFromPDF(file);
        if (!extracted.success || !extracted.text.trim()) {
          setError(
            extracted.error ||
              "Could not read that PDF. Please paste your resume text instead."
          );
          return;
        }
        setResumeText(extracted.text);
        setUploadedFileName(file.name);
      } else {
        const text = await file.text();
        if (!text.trim()) {
          setError("That file looks empty. Please paste your resume text.");
          return;
        }
        setResumeText(text);
        setUploadedFileName(file.name);
      }
    } catch {
      setError("Could not read that file. Try uploading a PDF/TXT or pasting your text.");
    }
  };

  const handleAnalyze = async () => {
    if (resumeText.trim().length < 80) {
      setError("Please paste or upload your resume first (at least a few lines).");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/futureproof/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          comfortLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to analyze your resume right now.");
        return;
      }

      const typed = data as FutureproofAnalyzeResponse;
      setAnalysis(typed);
      const initialSelected = typed.recommendedTools
        .filter((t) => t.preselected)
        .map((t) => t.id);
      setSelectedToolIds(
        initialSelected.length > 0
          ? initialSelected
          : typed.recommendedTools.slice(0, 2).map((t) => t.id)
      );
      setUsedAutoStandard(false);
      setExpandedToolDetails({});
      setStep(2);
    } catch {
      setError("Network error while analyzing your resume. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTool = (toolId: string) => {
    setUsedAutoStandard(false);
    setSelectedToolIds((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : prev.length < 5
          ? [...prev, toolId]
          : prev
    );
  };

  const handleGenerate = async (forceIndustryStandards = false) => {
    if (!analysis) return;
    setError(null);
    setIsGenerating(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/futureproof/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          industry: analysis.industry,
          selectedToolIds: forceIndustryStandards ? [] : selectedToolIds,
          useIndustryStandards:
            forceIndustryStandards || usedAutoStandard || selectedToolIds.length === 0,
          comfortLevel,
          accessToken: session?.access_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to generate AI upgrades right now.");
        return;
      }

      const typed = data as FutureproofGenerateResponse;
      setResult(typed);
      setActiveTab("changes");
      setExpandedOriginals({});
      setOpenTalkingPointId(typed.interviewTalkingPoints[0]?.toolId ?? null);
      setStep(3);
    } catch {
      setError("Network error while generating upgrades. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      // Ignore clipboard failures in restricted browsers
    }
  };

  const downloadMergedResume = () => {
    if (!result?.mergedResume) return;
    const blob = new Blob([result.mergedResume], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "futureproof-resume-with-ai.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-8 sm:py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Compact, Clear Header (dynamically adapts to ?role=doctor, ?role=admin, etc.) */}
        <section className="neo-box bg-[#F4F1EA] p-6 sm:p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block neo-tag bg-[#FF5722] text-white text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5">
              {heroVariant.badge}
            </span>
            <span className="text-xs font-mono font-semibold text-[#4B5563]">
              {heroVariant.proofPill}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-mono tracking-tight leading-tight">
            {heroVariant.headline}
          </h1>

          <p className="text-base text-[#374151] font-sans leading-relaxed">
            {heroVariant.subheadline}
          </p>

          {/* Simple 3-Step Progress Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
            {[
              { num: 1 as Step, label: "1. Your Resume" },
              { num: 2 as Step, label: "2. Pick Tools" },
              { num: 3 as Step, label: "3. See Changes" },
            ].map((s) => (
              <div
                key={s.num}
                className={`px-3 py-2 rounded-lg border-2 border-[#1C2028] font-bold text-center ${
                  step === s.num
                    ? "bg-[#1C2028] text-white"
                    : step > s.num
                      ? "bg-[#ECFDF5] text-[#065F46]"
                      : "bg-white text-[#4B5563]"
                }`}
              >
                {step > s.num ? `✓ ${s.label.slice(3)}` : s.label}
              </div>
            ))}
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-[#FEF2F2] border-2 border-[#DC2626] text-[#991B1B] font-sans text-sm font-semibold flex items-center justify-between gap-3"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="underline shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {/* STEP 1: Upload / Paste Resume */}
        {step === 1 && (
          <section className="neo-box bg-white p-6 sm:p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor="futureproof-resume-input"
                className="text-lg font-mono font-extrabold text-[#1C2028]"
              >
                Paste or upload your current resume
              </label>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload resume file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="neo-btn bg-[#F4F1EA] hover:bg-[#EDE8DE] text-[#1C2028] border-2 border-[#1C2028] px-4 py-2 text-sm font-mono font-bold"
                >
                  {uploadedFileName ? `✓ ${uploadedFileName}` : "Upload PDF / TXT"}
                </button>
              </div>
            </div>

            <textarea
              id="futureproof-resume-input"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={9}
              placeholder="Paste your resume here..."
              className="w-full rounded-xl border-2 border-[#1C2028] bg-[#FAF7F0] p-4 font-sans text-sm sm:text-base leading-relaxed focus:outline-none"
            />

            {/* Simple 2-Choice Tone Toggle */}
            <div className="space-y-2.5">
              <p className="text-sm font-sans font-semibold text-[#374151]">
                Choose your comfort level:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setComfortLevel("everyday")}
                  aria-pressed={comfortLevel === "everyday"}
                  className={`p-4 rounded-xl border-2 border-[#1C2028] text-left transition-all ${
                    comfortLevel === "everyday"
                      ? "bg-[#FFF4EF] shadow-[3px_3px_0px_#FF5722]"
                      : "bg-white hover:bg-[#FAF7F0]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-bold text-base">Everyday User</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1C2028] text-white">
                      BEST FOR MOST
                    </span>
                  </div>
                  <p className="text-sm text-[#374151] font-sans leading-relaxed">
                    Simple daily help: notes, emails, summaries, and research.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setComfortLevel("automator")}
                  aria-pressed={comfortLevel === "automator"}
                  className={`p-4 rounded-xl border-2 border-[#1C2028] text-left transition-all ${
                    comfortLevel === "automator"
                      ? "bg-[#FFF4EF] shadow-[3px_3px_0px_#FF5722]"
                      : "bg-white hover:bg-[#FAF7F0]"
                  }`}
                >
                  <div className="font-mono font-bold text-base mb-1">Workflow Automator</div>
                  <p className="text-sm text-[#374151] font-sans leading-relaxed">
                    Stronger impact: automating schedules, trackers, and team workflows.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-sm font-sans text-[#4B5563]">Free preview · Takes 15 sec</span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="neo-btn bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] px-6 py-3 text-sm font-mono font-bold uppercase tracking-wider"
              >
                {isAnalyzing ? "Matching Real Tools..." : "Find My AI Tools →"}
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: Scannable 2-Second Tool Picker */}
        {step === 2 && analysis && (
          <section className="neo-box bg-white p-5 sm:p-7 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#1C2028] text-white font-mono text-[10px] font-bold uppercase">
                  {analysis.subRoleLabel}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  {analysis.industryDisplayName}
                </span>
              </div>
              <h2 className="text-lg font-mono font-extrabold">
                Which real AI tools should we add?
              </h2>
            </div>

            {/* Zero-Thinking Fast Path right at the top */}
            <div className="p-4 rounded-xl bg-[#FFF4EF] border-2 border-[#1C2028] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-mono font-bold text-xs sm:text-sm text-[#1C2028]">
                  Not sure which tools to pick?
                </p>
                <p className="text-xs text-gray-700 font-sans">
                  Let us automatically add the safest industry-standard tools for your role.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                className="shrink-0 neo-btn bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wide"
              >
                {isGenerating ? "Upgrading Resume..." : "Pick Best Tools For Me →"}
              </button>
            </div>

            {!analysis.hasRecentRoles && (
              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#D97706] text-xs font-sans text-[#92400E]">
                <strong>Date check:</strong> Your listed roles ended before 2023, so we&apos;ll
                add a clean <strong>Modern AI Workflows</strong> section instead of editing older
                jobs.
              </div>
            )}

            {/* Compact, Scannable Tool List */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">
                Or customize your selection ({selectedToolIds.length} selected):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.recommendedTools.map((tool) => {
                  const isSelected = selectedToolIds.includes(tool.id);
                  const showDetails = Boolean(expandedToolDetails[tool.id]);
                  return (
                    <div
                      key={tool.id}
                      className={`p-3.5 rounded-xl border-2 border-[#1C2028] transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "bg-[#ECFDF5] shadow-[2px_2px_0px_#1C2028]"
                          : "bg-[#FAF7F0] opacity-85 hover:opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        aria-pressed={isSelected}
                        className="text-left space-y-1.5 w-full"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-extrabold text-sm text-[#1C2028]">
                              {tool.name}
                            </span>
                            {tool.isIndustryStandard && (
                              <span className="px-1.5 py-0.5 rounded bg-[#1C2028] text-white font-mono text-[9px] font-bold">
                                STANDARD
                              </span>
                            )}
                          </div>
                          <span
                            className={`w-5 h-5 rounded border-2 border-[#1C2028] flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected ? "bg-[#10B981] text-white" : "bg-white"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </div>

                        <p className="text-xs text-gray-800 font-sans leading-snug">
                          {tool.fitReason}
                        </p>
                      </button>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-gray-500">
                          {tool.complianceBadges[0] || tool.vendor}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedToolDetails((prev) => ({
                              ...prev,
                              [tool.id]: !prev[tool.id],
                            }))
                          }
                          className="text-[11px] font-mono font-bold underline text-gray-600 hover:text-[#1C2028]"
                        >
                          {showDetails ? "Hide" : "What is this?"}
                        </button>
                      </div>

                      {showDetails && (
                        <p className="text-[11px] text-gray-600 font-sans pt-1.5 border-t border-[#1C2028]/15">
                          {tool.shortDescription}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg border-2 border-[#1C2028] bg-white hover:bg-[#F4F1EA] font-mono text-xs font-bold"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating || selectedToolIds.length === 0}
                className="neo-btn bg-[#1C2028] hover:bg-black disabled:opacity-60 text-white border-2 border-[#1C2028] px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              >
                {isGenerating
                  ? "Upgrading Resume..."
                  : `Use Selected (${selectedToolIds.length}) →`}
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: Visual Diff + 3 Clean Tabs */}
        {step === 3 && result && (
          <div className="space-y-5">
            {/* At-a-Glance Impact Strip (Zero Reading Required) */}
            <section className="grid grid-cols-3 gap-3">
              <div className="neo-box bg-white p-3.5 border-2 border-[#1C2028] rounded-xl text-center">
                <div className="text-xl font-mono font-extrabold text-[#FF5722]">
                  {result.selectedTools.length}
                </div>
                <div className="text-[11px] font-mono font-bold text-gray-600">
                  Real AI Tools Added
                </div>
              </div>
              <div className="neo-box bg-white p-3.5 border-2 border-[#1C2028] rounded-xl text-center">
                <div className="text-xl font-mono font-extrabold text-[#10B981]">
                  {result.totalUpgrades}
                </div>
                <div className="text-[11px] font-mono font-bold text-gray-600">
                  Bullets Upgraded
                </div>
              </div>
              <div className="neo-box bg-white p-3.5 border-2 border-[#1C2028] rounded-xl text-center">
                <div className="text-xl font-mono font-extrabold text-[#1C2028]">✓</div>
                <div className="text-[11px] font-mono font-bold text-gray-600">
                  {result.placementMode === "inline_roles"
                    ? "Recent Roles Only"
                    : "Modern AI Section"}
                </div>
              </div>
            </section>

            {/* 3 Clean Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#1C2028] pb-2">
              <div className="flex flex-wrap gap-2" role="tablist">
                {[
                  { id: "changes" as ResultTab, label: `What Changed (${result.totalUpgrades})` },
                  { id: "interview" as ResultTab, label: "How to Explain It" },
                  { id: "export" as ResultTab, label: "Copy Full Resume" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-lg border-2 border-[#1C2028] font-mono text-xs font-bold transition-colors ${
                      activeTab === tab.id
                        ? "bg-[#1C2028] text-white"
                        : "bg-white hover:bg-[#F4F1EA] text-[#1C2028]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="font-mono text-xs font-bold underline text-gray-600 hover:text-[#1C2028]"
              >
                Change Tools
              </button>
            </div>

            {/* TAB 1: What Changed (Highlighted Inline Diff) */}
            {activeTab === "changes" && (
              <section className="space-y-3.5">
                <p className="text-xs font-sans text-gray-600">
                  <span className="inline-block bg-[#D1FAE5] text-[#065F46] font-semibold px-1.5 py-0.5 rounded border border-[#10B981]/50 mr-1">
                    Highlighted text
                  </span>{" "}
                  shows the exact AI skill added to your real experience.
                </p>

                {result.bulletUpgrades.map((item) => {
                  const showOriginal = Boolean(expandedOriginals[item.id]);
                  return (
                    <article
                      key={item.id}
                      className={`neo-box p-4 sm:p-5 border-2 border-[#1C2028] rounded-xl space-y-2.5 ${
                        item.isLocked
                          ? "bg-[#F4F1EA] opacity-90"
                          : "bg-white shadow-[3px_3px_0px_#1C2028]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-gray-600">
                          {item.roleTitle}
                          {item.company ? ` · ${item.company}` : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#FFF4EF] border border-[#FF5722] text-[#FF5722] font-mono text-[10px] font-bold">
                            + {item.toolName}
                          </span>
                          {!item.isLocked && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.upgradedBullet, item.id)}
                              className="font-mono text-[11px] font-bold underline text-[#1C2028]"
                            >
                              {copiedId === item.id ? "Copied ✓" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Main Upgraded Bullet with Instant Green Highlight */}
                      <p
                        className={`text-sm font-sans leading-relaxed ${
                          item.isLocked ? "text-gray-500 italic" : "text-[#1C2028]"
                        }`}
                      >
                        {item.isLocked ? (
                          item.upgradedBullet
                        ) : (
                          <HighlightedBullet
                            text={item.upgradedBullet}
                            highlight={item.addedHighlight}
                            fallbackToolName={item.toolName}
                          />
                        )}
                      </p>

                      {/* 1-Line Plain-English Impact + Optional Original Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#1C2028]/10 text-xs">
                        <span className="font-sans text-gray-700">
                          <strong className="font-mono text-[11px] text-[#065F46]">
                            Why it helps:{" "}
                          </strong>
                          {item.rationale}
                        </span>

                        {!item.isLocked && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOriginals((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="font-mono text-[11px] font-bold underline text-gray-500 hover:text-[#1C2028] shrink-0"
                          >
                            {showOriginal ? "Hide original" : "Compare original"}
                          </button>
                        )}
                      </div>

                      {showOriginal && !item.isLocked && (
                        <div className="p-2.5 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/15 text-xs text-gray-600 font-sans">
                          <span className="font-mono text-[10px] font-bold uppercase mr-1.5">
                            Before:
                          </span>
                          {item.originalBullet}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            )}

            {/* TAB 2: Plain-English Interview Cheat Sheet */}
            {activeTab === "interview" && (
              <section className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3">
                <p className="text-xs font-sans text-gray-600">
                  If an interviewer asks about a tool on your resume, here&apos;s a simple,
                  honest 30-second way to explain it.
                </p>

                <div className="space-y-2">
                  {result.interviewTalkingPoints.map((tp) => {
                    const isOpen = openTalkingPointId === tp.toolId;
                    return (
                      <div
                        key={tp.toolId}
                        className="rounded-xl border-2 border-[#1C2028] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenTalkingPointId(isOpen ? null : tp.toolId)}
                          className="w-full px-4 py-3 bg-[#F4F1EA] flex items-center justify-between text-left font-mono text-xs font-bold"
                        >
                          <span>
                            {tp.toolName} {tp.isLocked ? "🔒" : ""}
                          </span>
                          <span>{isOpen ? "−" : "+"}</span>
                        </button>
                        {isOpen && (
                          <div className="p-4 bg-white space-y-2.5 text-xs font-sans">
                            <p className="text-gray-600">{tp.plainEnglishSummary}</p>
                            <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/20 text-[#1C2028] leading-relaxed">
                              <span className="font-mono text-[10px] font-bold uppercase block mb-1 text-[#FF5722]">
                                What to say in an interview:
                              </span>
                              {tp.thirtySecondAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TAB 3: Skills Block & Full Merged Resume */}
            {activeTab === "export" && (
              <section className="space-y-4">
                <div className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-mono font-extrabold">
                      Ready-to-Paste AI Skills
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(result.skillsBlock.join(" • "), "skills-block")
                      }
                      className="font-mono text-xs font-bold underline"
                    >
                      {copiedId === "skills-block" ? "Copied ✓" : "Copy Skills"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.skillsBlock.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF7F0] border border-[#1C2028] font-mono text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {result.isUnlocked && result.mergedResume ? (
                  <div className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-mono font-extrabold">
                        Complete Updated Resume
                      </h2>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(result.mergedResume!, "merged-resume")}
                          className="font-mono text-xs font-bold underline"
                        >
                          {copiedId === "merged-resume" ? "Copied ✓" : "Copy All"}
                        </button>
                        <button
                          type="button"
                          onClick={downloadMergedResume}
                          className="px-3 py-1.5 rounded-lg bg-[#1C2028] text-white font-mono text-xs font-bold"
                        >
                          Download .txt
                        </button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-xl bg-[#FAF7F0] border border-[#1C2028]/20 p-4 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto">
                      {result.mergedResume}
                    </pre>
                  </div>
                ) : (
                  <div className="neo-box bg-[#F4F1EA] p-5 border-2 border-dashed border-[#1C2028] rounded-xl text-center space-y-2">
                    <p className="font-mono text-sm font-bold">
                      🔒 Full Merged Resume Export
                    </p>
                    <p className="text-xs font-sans text-gray-600">
                      Unlock with a one-time All-Access Pass to copy or download your complete updated
                      resume — plus unlimited Resume Tailor &amp; every service we offer.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Optional Email Lead Capture for Unauthenticated Visitors (feeds daily drip sequence) */}
            {!user && !result.isUnlocked && (
              <section className="neo-box bg-[#FFF4EF] p-5 border-2 border-[#1C2028] rounded-xl space-y-2.5">
                <div className="space-y-0.5">
                  <h3 className="text-base font-mono font-extrabold text-[#1C2028]">
                    Not ready to unlock yet? Save your free preview by email
                  </h3>
                  <p className="text-sm font-sans text-[#374151]">
                    We&apos;ll send you a 1-click sign-in link so you can come back to your
                    Futureproof upgrades anytime (no spam).
                  </p>
                </div>
                {leadStatus === "sent" ? (
                  <p className="text-sm font-sans font-semibold text-[#065F46]">
                    ✓ Check your inbox — we sent your 1-click sign-in link to{" "}
                    <strong>{leadEmail}</strong>.
                  </p>
                ) : (
                  <form
                    onSubmit={handleLeadCapture}
                    className="flex flex-col sm:flex-row gap-2.5 pt-1"
                  >
                    <label htmlFor="futureproof-lead-email" className="visually-hidden">
                      Email address
                    </label>
                    <input
                      id="futureproof-lead-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 rounded-lg border-2 border-[#1C2028] bg-white px-3.5 py-2.5 text-sm font-sans"
                    />
                    <button
                      type="submit"
                      disabled={leadStatus === "sending"}
                      className="neo-btn bg-[#1C2028] hover:bg-black disabled:opacity-60 text-white border-2 border-[#1C2028] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider shrink-0"
                    >
                      {leadStatus === "sending" ? "Sending..." : "Email My Link →"}
                    </button>
                  </form>
                )}
                {leadStatus === "error" && (
                  <p className="text-xs font-sans text-[#991B1B]">
                    Could not send link right now — please double-check your email or try signing
                    in below.
                  </p>
                )}
              </section>
            )}

            {/* Compact Upgrade Banner for Free Users — opens inline paywall modal */}
            {!result.isUnlocked && (
              <section className="neo-box bg-[#1C2028] text-white p-6 border-2 border-[#1C2028] shadow-[4px_4px_0px_#FF5722] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-mono font-extrabold">
                    Unlock all {result.totalUpgrades} upgrades + every service we offer
                  </h3>
                  <p className="text-sm text-gray-200 font-sans leading-relaxed">
                    One All-Access Pass (strictly one-time, zero subscriptions) unlocks Futureproof AI, 30-sec interview scripts, and unlimited Resume Tailor for your entire access period.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaywall(true)}
                  className="shrink-0 neo-btn bg-[#FF5722] hover:bg-[#E64A19] text-white border-2 border-white px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider"
                >
                  Unlock Everything →
                </button>
              </section>
            )}
          </div>
        )}
      </div>

      <TierSelectionModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onAlreadyHasAccess={() => {
          setShowPaywall(false);
          handleGenerate(usedAutoStandard);
        }}
      />
    </div>
  );
}
