"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { extractTextFromPDF, isPDFFile } from "@/app/utils/pdfExtractor";
import type { ComfortLevel } from "@/app/config/aiToolRegistry";
import type {
  FutureproofAnalyzeResponse,
  FutureproofGenerateResponse,
} from "@/app/utils/futureproofSanitizer";

type Step = 1 | 2 | 3;

export default function FutureproofClient() {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [resumeText, setResumeText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [comfortLevel, setComfortLevel] = useState<ComfortLevel>("everyday");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<FutureproofAnalyzeResponse | null>(null);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [usedAutoStandard, setUsedAutoStandard] = useState(false);

  const [result, setResult] = useState<FutureproofGenerateResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openTalkingPointId, setOpenTalkingPointId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      if (isPDFFile(file)) {
        const extracted = await extractTextFromPDF(file);
        if (!extracted.success || !extracted.text.trim()) {
          setError(extracted.error || "Could not extract text from PDF. Please paste your resume text instead.");
          return;
        }
        setResumeText(extracted.text);
        setUploadedFileName(file.name);
      } else {
        const text = await file.text();
        if (!text.trim()) {
          setError("Uploaded file appears empty. Please paste your resume text.");
          return;
        }
        setResumeText(text);
        setUploadedFileName(file.name);
      }
    } catch {
      setError("Failed to read file. Try uploading a PDF/TXT file or pasting your resume directly.");
    }
  };

  const handleAnalyze = async () => {
    if (resumeText.trim().length < 80) {
      setError("Please paste or upload your resume (at least 80 characters) to continue.");
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

  const handleSelectIndustryStandards = () => {
    if (!analysis) return;
    const standardIds = analysis.recommendedTools
      .filter((t) => t.isIndustryStandard)
      .slice(0, 3)
      .map((t) => t.id);
    setSelectedToolIds(
      standardIds.length > 0
        ? standardIds
        : analysis.recommendedTools.slice(0, 2).map((t) => t.id)
    );
    setUsedAutoStandard(true);
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
          useIndustryStandards: forceIndustryStandards || usedAutoStandard || selectedToolIds.length === 0,
          comfortLevel,
          accessToken: session?.access_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to generate AI experience upgrades right now.");
        return;
      }

      const typed = data as FutureproofGenerateResponse;
      setResult(typed);
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
    <main className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Banner */}
        <section className="neo-box bg-[#F4F1EA] p-6 sm:p-8 border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] rounded-xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="neo-tag bg-[#FF5722] text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5">
              FUTUREPROOF
            </span>
            <span className="neo-tag bg-white text-[#1C2028] border border-[#1C2028] text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5">
              INDUSTRY-STANDARD AI EXPERIENCE
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-mono tracking-tight leading-tight">
            Add Real, Coherent AI Experience to Your Resume
          </h1>

          <p className="text-sm sm:text-base text-gray-700 font-sans max-w-2xl leading-relaxed">
            Haven&apos;t formally used AI at work yet? Futureproof matches{" "}
            <strong className="text-[#1C2028]">real, industry-standard AI tools</strong>{" "}
            (like HIPAA-compliant ambient clinical scribes for doctors or Claude Enterprise &amp;
            Copilot for admins) directly to your actual job history—plus plain-English interview
            talking points.
          </p>

          {/* 3-Step Indicator */}
          <div className="grid grid-cols-3 gap-2 pt-2 font-mono text-[11px]">
            {[
              { num: 1 as Step, label: "1. Upload Resume" },
              { num: 2 as Step, label: "2. Pick AI Tools" },
              { num: 3 as Step, label: "3. Review & Export" },
            ].map((s) => (
              <div
                key={s.num}
                className={`px-3 py-2 rounded-lg border-2 border-[#1C2028] font-bold text-center transition-colors ${
                  step === s.num
                    ? "bg-[#1C2028] text-white"
                    : step > s.num
                      ? "bg-[#ECFDF5] text-[#065F46]"
                      : "bg-white text-gray-500"
                }`}
              >
                {s.label}
              </div>
            ))}
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-[#FEF2F2] border-2 border-[#DC2626] text-[#991B1B] font-mono text-xs font-bold flex items-center justify-between gap-3"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STEP 1: Upload / Paste Resume */}
        {step === 1 && (
          <section className="neo-box bg-white p-6 sm:p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-mono font-extrabold">
                  Step 1: Share Your Current Resume
                </h2>
                <p className="text-xs text-gray-600 font-sans">
                  We analyze your profession, responsibilities, and dates so every AI tool makes
                  100% sense for your background.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="neo-btn bg-[#F4F1EA] hover:bg-[#EDE8DE] text-[#1C2028] border-2 border-[#1C2028] px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wide"
                >
                  {uploadedFileName ? `✓ ${uploadedFileName}` : "Upload PDF / TXT"}
                </button>
              </div>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={10}
              placeholder="Paste your full resume text here (job titles, employers, dates, and bullet points)..."
              className="w-full rounded-xl border-2 border-[#1C2028] bg-[#FAF7F0] p-4 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
            />

            {/* Comfort Level Selector */}
            <div className="space-y-2">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-gray-600">
                How deeply should AI appear on your resume?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setComfortLevel("everyday")}
                  className={`p-4 rounded-xl border-2 border-[#1C2028] text-left transition-all ${
                    comfortLevel === "everyday"
                      ? "bg-[#FFF4EF] shadow-[3px_3px_0px_#FF5722]"
                      : "bg-white hover:bg-[#FAF7F0]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm">Everyday AI Adopter</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C2028] text-white">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-sans">
                    Natural daily usage—drafting, ambient notes, meeting summaries, and research
                    assistance. Easiest to speak to in interviews.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setComfortLevel("automator")}
                  className={`p-4 rounded-xl border-2 border-[#1C2028] text-left transition-all ${
                    comfortLevel === "automator"
                      ? "bg-[#FFF4EF] shadow-[3px_3px_0px_#FF5722]"
                      : "bg-white hover:bg-[#FAF7F0]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm">Workflow Automator</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F4F1EA] border border-[#1C2028]">
                      POWER USER
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-sans">
                    Highlights no-code workflow automation, SOP standardization, and cross-tool
                    efficiency improvements for your team.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-gray-500">
                Free instant analysis · No credit card required
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="neo-btn bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] px-6 py-3 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider"
              >
                {isAnalyzing ? "Analyzing Your Industry..." : "Analyze My Resume →"}
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: Pick Curated Industry-Standard AI Tools */}
        {step === 2 && analysis && (
          <section className="neo-box bg-white p-6 sm:p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#1C2028]/15 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-[#1C2028] text-white font-mono text-[10px] font-bold uppercase">
                    DETECTED: {analysis.industryDisplayName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-[#F4F1EA] border border-[#1C2028] font-mono text-[10px] font-bold">
                    {analysis.subRoleLabel}
                  </span>
                </div>
                <h2 className="text-lg font-mono font-extrabold pt-1">
                  Step 2: Choose the AI Tools to Weave Into Your Resume
                </h2>
                <p className="text-xs text-gray-600 font-sans">
                  We pre-selected the top industry standards for your role. Toggle any tools you
                  like—or let us pick the safest defaults.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSelectIndustryStandards}
                className={`shrink-0 px-3.5 py-2 rounded-lg border-2 border-[#1C2028] font-mono text-xs font-bold transition-colors ${
                  usedAutoStandard
                    ? "bg-[#ECFDF5] text-[#065F46]"
                    : "bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E]"
                }`}
              >
                {usedAutoStandard
                  ? "✓ Industry Standards Selected"
                  : "Unsure? Pick Industry Standards"}
              </button>
            </div>

            {!analysis.hasRecentRoles && (
              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border-2 border-[#D97706] text-xs font-sans text-[#92400E]">
                <strong>Timeline Protection Active:</strong> Your listed roles ended before 2023.
                To keep your resume 100% credible, we&apos;ll place your AI experience into a clean{" "}
                <strong>Modern Workflows &amp; AI Proficiency</strong> section rather than
                retroactively inserting modern tools into older roles.
              </div>
            )}

            {/* Selectable Tool Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.recommendedTools.map((tool) => {
                const isSelected = selectedToolIds.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    aria-pressed={isSelected}
                    className={`p-4 rounded-xl border-2 border-[#1C2028] text-left transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-[#FFF4EF] shadow-[3px_3px_0px_#FF5722]"
                        : "bg-[#FAF7F0] hover:bg-white opacity-85"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono font-extrabold text-sm text-[#1C2028]">
                            {tool.name}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500">
                            {tool.vendor}
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded border-2 border-[#1C2028] flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected ? "bg-[#FF5722] text-white" : "bg-white"
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {tool.isIndustryStandard && (
                          <span className="px-2 py-0.5 rounded bg-[#1C2028] text-white font-mono text-[10px] font-bold">
                            INDUSTRY STANDARD
                          </span>
                        )}
                        {tool.complianceBadges.map((badge) => (
                          <span
                            key={badge}
                            className="px-2 py-0.5 rounded bg-white border border-[#1C2028]/40 font-mono text-[10px] font-semibold text-gray-700"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-gray-700 font-sans leading-relaxed">
                        {tool.shortDescription}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#1C2028]/15 text-[11px] font-sans text-[#1C2028]">
                      <span className="font-mono font-bold text-[#FF5722]">Why it fits: </span>
                      {tool.fitReason}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg border-2 border-[#1C2028] bg-white hover:bg-[#F4F1EA] font-mono text-xs font-bold"
              >
                ← Back to Resume
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  className="px-4 py-2.5 rounded-lg border-2 border-[#1C2028] bg-[#F4F1EA] hover:bg-[#EDE8DE] font-mono text-xs font-bold disabled:opacity-60"
                >
                  Unsure? Use Standards &amp; Generate
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate(false)}
                  disabled={isGenerating || selectedToolIds.length === 0}
                  className="neo-btn bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] px-6 py-2.5 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider"
                >
                  {isGenerating
                    ? "Weaving Into Your Resume..."
                    : `Weave ${selectedToolIds.length} Tool${selectedToolIds.length === 1 ? "" : "s"} Into Resume →`}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: Before/After Results, Interview Prep & Export */}
        {step === 3 && result && (
          <div className="space-y-6">
            {/* Summary Bar */}
            <section className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-[#10B981] text-white font-mono text-[10px] font-bold uppercase">
                    {result.isUnlocked
                      ? "FULL ACCESS UNLOCKED"
                      : `FREE PREVIEW (${result.unlockedCount} OF ${result.totalUpgrades} SHOWN)`}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-600">
                    {result.industryDisplayName}
                  </span>
                </div>
                <p className="text-xs font-sans text-gray-700">
                  Integrated tools:{" "}
                  <strong>{result.selectedTools.map((t) => t.name).join(", ")}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3.5 py-2 rounded-lg border-2 border-[#1C2028] bg-[#F4F1EA] hover:bg-[#EDE8DE] font-mono text-xs font-bold"
                >
                  ← Change Tools
                </button>
                {result.isUnlocked && result.mergedResume && (
                  <button
                    type="button"
                    onClick={downloadMergedResume}
                    className="px-4 py-2 rounded-lg border-2 border-[#1C2028] bg-[#1C2028] text-white font-mono text-xs font-bold"
                  >
                    Download Updated Resume (.txt)
                  </button>
                )}
              </div>
            </section>

            {/* Bullet Upgrades */}
            <section className="space-y-4">
              <h2 className="text-lg font-mono font-extrabold">
                Coherent Resume Bullet Upgrades
              </h2>

              {result.bulletUpgrades.map((item) => (
                <article
                  key={item.id}
                  className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs font-bold text-[#1C2028]">
                      {item.roleTitle}
                      {item.company ? ` · ${item.company}` : ""}
                      {item.dateRange ? ` (${item.dateRange})` : ""}
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-[#FFF4EF] border border-[#FF5722] text-[#FF5722] font-mono text-[10px] font-bold">
                      {item.toolName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/20">
                      <div className="font-mono text-[10px] font-bold uppercase text-gray-500 mb-1">
                        Original Responsibility
                      </div>
                      <p className="font-sans text-gray-700 leading-relaxed">
                        {item.originalBullet}
                      </p>
                    </div>

                    <div
                      className={`p-3 rounded-lg border-2 ${
                        item.isLocked
                          ? "bg-[#F4F1EA] border-dashed border-[#1C2028]/40"
                          : "bg-[#ECFDF5] border-[#10B981]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold uppercase text-[#065F46]">
                          Futureproof Upgrade
                        </span>
                        {!item.isLocked && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.upgradedBullet, item.id)}
                            className="font-mono text-[10px] font-bold underline text-[#1C2028]"
                          >
                            {copiedId === item.id ? "Copied ✓" : "Copy"}
                          </button>
                        )}
                      </div>
                      <p
                        className={`font-sans leading-relaxed ${
                          item.isLocked ? "text-gray-500 italic" : "text-[#1C2028] font-medium"
                        }`}
                      >
                        {item.upgradedBullet}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] font-sans text-gray-600">
                    <span className="font-mono font-bold text-[#1C2028]">Coherence Note: </span>
                    {item.rationale}
                  </p>
                </article>
              ))}
            </section>

            {/* Skills Block */}
            <section className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-mono font-extrabold">
                  AI Tools &amp; Workflows Skills Block
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
                    className="px-3 py-1 rounded-lg bg-[#FAF7F0] border border-[#1C2028] font-mono text-xs font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            {/* Interview Talking Points */}
            <section className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3">
              <h2 className="text-base font-mono font-extrabold">
                How to Speak to These Tools in Interviews
              </h2>
              <p className="text-xs font-sans text-gray-600">
                Plain-English 30-second answers so you sound natural, accurate, and confident when
                recruiters ask about your AI workflow experience.
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
                        onClick={() =>
                          setOpenTalkingPointId(isOpen ? null : tp.toolId)
                        }
                        className="w-full px-4 py-3 bg-[#F4F1EA] flex items-center justify-between text-left font-mono text-xs font-bold"
                      >
                        <span>
                          {tp.toolName}{" "}
                          {tp.isLocked ? "🔒" : ""}
                        </span>
                        <span>{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen && (
                        <div className="p-4 bg-white space-y-2 text-xs font-sans">
                          <p className="text-gray-600">{tp.plainEnglishSummary}</p>
                          <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/20 text-[#1C2028]">
                            <span className="font-mono text-[10px] font-bold uppercase block mb-1 text-[#FF5722]">
                              30-Second Interview Script
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

            {/* Freemium Paywall CTA OR Full Merged Resume */}
            {!result.isUnlocked ? (
              <section className="neo-box bg-[#1C2028] text-white p-6 sm:p-8 border-2 border-[#1C2028] shadow-[5px_5px_0px_#FF5722] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded bg-[#FF5722] text-white font-mono text-[10px] font-bold uppercase">
                    ONE-TIME PASS · NO SUBSCRIPTION
                  </span>
                  <h3 className="text-lg sm:text-xl font-mono font-extrabold">
                    Unlock All {result.totalUpgrades} Upgrades, Full Merged Resume &amp; Interview
                    Scripts
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 font-sans">
                    Your existing AI Resume Tailor pass unlocks both Futureproof and unlimited ATS
                    job-specific tailoring.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="shrink-0 neo-btn bg-[#FF5722] hover:bg-[#E64A19] text-white border-2 border-white px-5 py-3 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider"
                >
                  Unlock Full Access →
                </Link>
              </section>
            ) : (
              result.mergedResume && (
                <section className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-mono font-extrabold">
                      Complete Updated Resume
                    </h2>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(result.mergedResume!, "merged-resume")}
                      className="font-mono text-xs font-bold underline"
                    >
                      {copiedId === "merged-resume" ? "Copied ✓" : "Copy Full Resume"}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl bg-[#FAF7F0] border border-[#1C2028]/20 p-4 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto">
                    {result.mergedResume}
                  </pre>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
