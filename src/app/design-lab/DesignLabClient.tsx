"use client";

import React, { useState } from "react";
import TailorBot from "@/app/components/neo/TailorBot";

type StyleId = "pomegranate" | "toybox" | "calm" | "risograph" | "luminous";

interface StyleMeta {
  id: StyleId;
  number: string;
  name: string;
  vibe: string;
  swatch: [string, string, string];
}

const STYLES: StyleMeta[] = [
  {
    id: "pomegranate",
    number: "01",
    name: "Pomegranate Tactile",
    vibe: "Playful berry & cream, rainbow arcs, chunky token icons (closest to your sample)",
    swatch: ["#E93B5A", "#FFFBF2", "#F7B538"],
  },
  {
    id: "toybox",
    number: "02",
    name: "Friendly Toybox 3D",
    vibe: "Crisp white, squishy 3D buttons, cheerful Duolingo-like clarity",
    swatch: ["#2563EB", "#10B981", "#F59E0B"],
  },
  {
    id: "calm",
    number: "03",
    name: "Soft Studio Calm",
    vibe: "Ultra-clean Apple/Notion airiness, whisper shadows, zero clutter",
    swatch: ["#F7F8FA", "#111827", "#6366F1"],
  },
  {
    id: "risograph",
    number: "04",
    name: "Warm Paper Risograph",
    vibe: "Artistic print-zine warmth, sage + terracotta, cozy editorial charm",
    swatch: ["#F6F1E7", "#2E6F5E", "#D95D39"],
  },
  {
    id: "luminous",
    number: "05",
    name: "Luminous Bento Dark",
    vibe: "Modern consumer dark mode, soft glowing arcs, sleek high contrast",
    swatch: ["#0F111A", "#FF8A65", "#34D399"],
  },
];

/**
 * Shared Rainbow Concentric Arc Gauge (SVG) — visualizes 4 resume signals at a glance
 * with zero paragraphs to read.
 */
function RainbowArcGauge({
  colors,
  trackColor,
  strokeOutline,
}: {
  colors: [string, string, string, string];
  trackColor: string;
  strokeOutline?: string;
}) {
  const arcs = [
    { r: 108, pct: 0.92, color: colors[0] },
    { r: 86, pct: 0.86, color: colors[1] },
    { r: 64, pct: 0.78, color: colors[2] },
    { r: 42, pct: 0.96, color: colors[3] },
  ];

  return (
    <svg
      viewBox="0 0 260 142"
      className="w-full max-w-[260px] mx-auto overflow-visible"
      role="img"
      aria-label="Resume match score arcs showing 92% overall match"
    >
      {arcs.map((a, i) => {
        const len = Math.PI * a.r;
        const dash = len * a.pct;
        return (
          <g key={i}>
            {/* Track */}
            <path
              d={`M ${130 - a.r} 130 A ${a.r} ${a.r} 0 0 1 ${130 + a.r} 130`}
              fill="none"
              stroke={trackColor}
              strokeWidth={14}
              strokeLinecap="round"
            />
            {/* Optional subtle outline for tactile storybook look */}
            {strokeOutline && (
              <path
                d={`M ${130 - a.r} 130 A ${a.r} ${a.r} 0 0 1 ${130 + a.r} 130`}
                fill="none"
                stroke={strokeOutline}
                strokeWidth={16.5}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${len}`}
              />
            )}
            {/* Colored Progress Arc */}
            <path
              d={`M ${130 - a.r} 130 A ${a.r} ${a.r} 0 0 1 ${130 + a.r} 130`}
              fill="none"
              stroke={a.color}
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${len}`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function DesignLabClient() {
  const [selected, setSelected] = useState<StyleId>("pomegranate");
  const currentMeta = STYLES.find((s) => s.id === selected)!;

  return (
    <div className="min-h-screen bg-[#14161D] text-white py-6 px-3 sm:px-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Style Switcher Bar */}
        <div className="bg-[#1E222D] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#FF8A65] font-bold">
                DESIGN LAB · 5 ART DIRECTIONS
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                Tap a style to preview on your phone
              </h1>
            </div>
            <span className="text-xs text-gray-300 bg-white/10 px-3 py-1 rounded-full">
              {currentMeta.number} / 05 · {currentMeta.name}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {STYLES.map((s) => {
              const active = s.id === selected;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    active
                      ? "bg-white text-[#14161D] border-white font-bold shadow-md"
                      : "bg-white/5 text-gray-200 border-white/15 hover:bg-white/10"
                  }`}
                >
                  <span className="flex -space-x-1">
                    {s.swatch.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="text-xs whitespace-nowrap">
                    {s.number}. {s.name}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-300">{currentMeta.vibe}</p>
        </div>

        {/* Phone Frame Container */}
        <div className="max-w-[400px] mx-auto rounded-[36px] p-2.5 bg-[#0B0D12] shadow-2xl border border-white/15">
          <div className="rounded-[28px] overflow-hidden min-h-[700px] flex flex-col">
            {/* ============================================================ */}
            {/* STYLE 1: POMEGRANATE TACTILE                                 */}
            {/* ============================================================ */}
            {selected === "pomegranate" && (
              <div className="flex-1 bg-[#FFFBF2] text-[#3A1422] flex flex-col justify-between font-sans">
                <div>
                  {/* Berry Curved Header */}
                  <div className="bg-[#E93B5A] px-5 pt-5 pb-12 rounded-b-[32px] relative">
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-full bg-white border-2 border-[#3A1422] flex items-center justify-center text-sm shadow-[0_2px_0_#3A1422]">
                        🏠
                      </span>
                      <span className="font-extrabold text-xl tracking-tight text-white drop-shadow-[0_2px_0_#3A1422]">
                        resume tailor
                      </span>
                      <span className="w-9 h-9 rounded-full bg-white border-2 border-[#3A1422] flex items-center justify-center text-sm shadow-[0_2px_0_#3A1422]">
                        ⚙️
                      </span>
                    </div>
                  </div>

                  {/* Overlapping Pill Score Header + Mascot Medallion */}
                  <div className="px-4 -mt-9 relative z-10">
                    <div className="bg-white border-2 border-[#3A1422] rounded-full px-4 py-2.5 flex items-center justify-between shadow-[0_4px_0_#3A1422]">
                      <div className="text-center pl-2">
                        <div className="text-2xl font-black leading-none">58%</div>
                        <div className="text-[11px] text-[#7A4B5A] font-semibold mt-0.5">
                          Before
                        </div>
                      </div>

                      <div className="w-16 h-16 -my-5 rounded-full bg-[#E93B5A] border-2 border-[#3A1422] shadow-[0_4px_0_#3A1422] flex items-center justify-center">
                        <TailorBot size={42} state="celebrating" />
                      </div>

                      <div className="text-center pr-2">
                        <div className="text-2xl font-black text-[#128C66] leading-none">92%</div>
                        <div className="text-[11px] text-[#7A4B5A] font-semibold mt-0.5">
                          After (+34)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rainbow Arc Visual */}
                  <div className="px-5 pt-6 pb-3 text-center space-y-2">
                    <p className="text-sm font-bold text-[#3A1422]">Your match breakdown</p>
                    <RainbowArcGauge
                      colors={["#F7B538", "#7CC6FE", "#F283B6", "#6AD19E"]}
                      trackColor="#F4ECE0"
                      strokeOutline="#3A1422"
                    />
                  </div>

                  {/* Ultra-Clean 4-Row Summary Card (No Text Walls!) */}
                  <div className="px-4 pb-4">
                    <div className="bg-white border-2 border-[#3A1422] rounded-3xl overflow-hidden shadow-[0_4px_0_#3A1422]">
                      <div className="bg-[#F8F1E5] px-4 py-2.5 text-center text-xs font-extrabold text-[#3A1422] border-b border-[#3A1422]/15">
                        Ready to apply
                      </div>
                      {[
                        { icon: "⚡", bg: "#F7B538", label: "ATS Keywords", val: "14 / 15" },
                        { icon: "✨", bg: "#7CC6FE", label: "Bullets Upgraded", val: "6" },
                        { icon: "🤖", bg: "#F283B6", label: "AI Tools Added", val: "3" },
                        { icon: "📏", bg: "#6AD19E", label: "Fits 1 Page", val: "100%" },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="px-4 py-3 flex items-center justify-between border-b last:border-b-0 border-[#3A1422]/10"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-8 h-8 rounded-full border-2 border-[#3A1422] flex items-center justify-center text-sm shadow-[0_2px_0_#3A1422]"
                              style={{ backgroundColor: row.bg }}
                            >
                              {row.icon}
                            </span>
                            <span className="text-sm font-bold">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black">{row.val}</span>
                            <span className="w-6 h-6 rounded-full border border-[#3A1422]/30 flex items-center justify-center text-xs">
                              →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Soft Floating Bottom Nav */}
                <div className="bg-white border-t-2 border-[#3A1422] px-4 py-2.5 flex items-center justify-around rounded-t-3xl">
                  {[
                    { icon: "✨", label: "Tailor", active: true },
                    { icon: "🚀", label: "Add AI", active: false },
                    { icon: "🎯", label: "Agents", active: false },
                    { icon: "👤", label: "Profile", active: false },
                  ].map((nav) => (
                    <div
                      key={nav.label}
                      className={`px-3.5 py-1.5 rounded-full text-center ${
                        nav.active ? "bg-[#F8F1E5] font-extrabold" : "text-[#7A4B5A]"
                      }`}
                    >
                      <div className="text-base leading-none">{nav.icon}</div>
                      <div className="text-[10px] font-bold mt-1">{nav.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STYLE 2: FRIENDLY TOYBOX 3D (DUOLINGO-INSPIRED)              */}
            {/* ============================================================ */}
            {selected === "toybox" && (
              <div className="flex-1 bg-white text-[#1E293B] flex flex-col justify-between font-sans">
                <div className="p-5 space-y-5">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-2xl bg-[#2563EB] flex items-center justify-center shadow-[0_3px_0_#1D4ED8]">
                        <TailorBot size={26} state="celebrating" />
                      </div>
                      <span className="font-black text-base text-[#1E293B]">ResumeTailor</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] font-extrabold text-xs">
                      🔥 3d Streak
                    </span>
                  </div>

                  {/* Mascot Speech Bubble */}
                  <div className="flex items-center gap-3 bg-[#EFF6FF] rounded-3xl p-4 border-2 border-[#BFDBFE]">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#93C5FD] flex items-center justify-center shrink-0">
                      <TailorBot size={42} state="celebrating" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#1E3A8A]">
                        Nice jump! +34% match
                      </p>
                      <p className="text-xs text-[#3B82F6] font-semibold">
                        6 quick upgrades ready to approve.
                      </p>
                    </div>
                  </div>

                  {/* Big Visual Progress Bar */}
                  <div className="bg-[#F8FAFC] rounded-3xl p-4 border-2 border-[#E2E8F0] space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#64748B]">BEFORE</span>
                        <div className="text-2xl font-black text-[#64748B]">58%</div>
                      </div>
                      <span className="text-lg font-black text-[#10B981]">→</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#059669]">NEW SCORE</span>
                        <div className="text-3xl font-black text-[#10B981]">92%</div>
                      </div>
                    </div>
                    <div className="h-4 rounded-full bg-[#E2E8F0] overflow-hidden p-0.5">
                      <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#2563EB] to-[#10B981]" />
                    </div>
                  </div>

                  {/* Tactile Action Tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: "✨", title: "6 Bullets", sub: "All ≤ 2 lines", tint: "#ECFDF5", accent: "#059669" },
                      { icon: "🤖", title: "3 AI Tools", sub: "HIPAA-safe", tint: "#EFF6FF", accent: "#2563EB" },
                      { icon: "🎯", title: "14 Keywords", sub: "ATS matched", tint: "#FFFBEB", accent: "#D97706" },
                      { icon: "💬", title: "3 Scripts", sub: "30s answers", tint: "#FDF2F8", accent: "#DB2777" },
                    ].map((tile) => (
                      <div
                        key={tile.title}
                        className="rounded-2xl p-3.5 border-2 border-[#E2E8F0] space-y-1"
                        style={{ backgroundColor: tile.tint }}
                      >
                        <span className="text-xl">{tile.icon}</span>
                        <div className="font-black text-sm" style={{ color: tile.accent }}>
                          {tile.title}
                        </div>
                        <div className="text-xs text-[#475569] font-medium">{tile.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Squishy 3D Primary CTA */}
                  <button
                    type="button"
                    className="w-full py-4 rounded-2xl bg-[#10B981] text-white font-black text-sm uppercase tracking-wider shadow-[0_5px_0_#059669] active:translate-y-0.5 transition-transform"
                  >
                    Review 6 Upgrades →
                  </button>
                </div>

                {/* Clean Bottom Tabs */}
                <div className="border-t-2 border-[#F1F5F9] px-5 py-3 flex justify-around text-xs font-bold text-[#64748B]">
                  <span className="text-[#2563EB]">✨ Tailor</span>
                  <span>🚀 Add AI</span>
                  <span>🎯 Talent</span>
                  <span>👤 Me</span>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STYLE 3: SOFT STUDIO CALM (APPLE / NOTION AIRINESS)          */}
            {/* ============================================================ */}
            {selected === "calm" && (
              <div className="flex-1 bg-[#F7F8FA] text-[#111827] flex flex-col justify-between font-sans">
                <div className="p-6 space-y-6">
                  {/* Minimal Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-black/5 flex items-center justify-center">
                        <TailorBot size={24} state="idle" />
                      </div>
                      <span className="font-semibold text-sm tracking-tight">AI Resume Tailor</span>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center text-xs">
                      👤
                    </span>
                  </div>

                  {/* Serene Single-Focus Hero Metric */}
                  <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] text-center space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-semibold">
                      Match Score Ready
                    </span>
                    <div className="flex items-baseline justify-center gap-3">
                      <span className="text-2xl font-medium text-[#9CA3AF] line-through">58%</span>
                      <span className="text-5xl font-bold tracking-tight text-[#111827]">92%</span>
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      6 concise edits · 3 verified AI tools added
                    </p>
                  </div>

                  {/* Calm List */}
                  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] divide-y divide-black/[0.05]">
                    {[
                      { label: "Bullet Upgrades", meta: "6 ready", dot: "#10B981" },
                      { label: "AI Experience", meta: "3 tools", dot: "#6366F1" },
                      { label: "Interview Prep", meta: "30s scripts", dot: "#F59E0B" },
                      { label: "Layout Check", meta: "Fits 1 page", dot: "#14B8A6" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="px-5 py-3.5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.dot }}
                          />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="text-xs font-medium text-[#6B7280]">{item.meta} ›</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full py-3.5 rounded-2xl bg-[#111827] text-white text-sm font-semibold shadow-sm hover:bg-black transition-colors"
                  >
                    Open Review
                  </button>
                </div>

                <div className="bg-white/90 backdrop-blur border-t border-black/[0.06] px-6 py-3 flex justify-around text-xs font-medium text-[#6B7280]">
                  <span className="text-[#111827] font-semibold">Tailor</span>
                  <span>Futureproof</span>
                  <span>Talent</span>
                  <span>Account</span>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STYLE 4: WARM PAPER RISOGRAPH (ARTISTIC EDITORIAL)           */}
            {/* ============================================================ */}
            {selected === "risograph" && (
              <div className="flex-1 bg-[#F6F1E7] text-[#24211D] flex flex-col justify-between font-sans">
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif italic text-xl font-bold text-[#2E6F5E]">
                      Tailor Studio
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[#D95D39]/15 flex items-center justify-center">
                      <TailorBot size={28} state="celebrating" />
                    </div>
                  </div>

                  {/* Artistic Headline + Arc */}
                  <div className="bg-[#FFFDF9] rounded-[28px] p-5 border border-[#24211D]/10 space-y-3 text-center">
                    <p className="font-serif text-2xl font-bold leading-snug">
                      Your resume grew from{" "}
                      <span className="text-[#8C7B6B]">58%</span> to{" "}
                      <span className="text-[#2E6F5E]">92%</span>
                    </p>
                    <RainbowArcGauge
                      colors={["#D95D39", "#2E6F5E", "#E0A422", "#6C8EAD"]}
                      trackColor="#EFE8DB"
                    />
                  </div>

                  {/* Editorial Pill Rows */}
                  <div className="space-y-2.5">
                    {[
                      { badge: "01", title: "6 Sharper Bullets", right: "Same length", bg: "#E7F0EC", ink: "#2E6F5E" },
                      { badge: "02", title: "3 Real AI Tools", right: "HIPAA-safe", bg: "#FBECE7", ink: "#B94726" },
                      { badge: "03", title: "Interview Scripts", right: "30s each", bg: "#FBF3DE", ink: "#9A6B10" },
                    ].map((r) => (
                      <div
                        key={r.badge}
                        className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                        style={{ backgroundColor: r.bg }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="font-serif italic font-bold text-sm"
                            style={{ color: r.ink }}
                          >
                            {r.badge}
                          </span>
                          <span className="text-sm font-semibold">{r.title}</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: r.ink }}>
                          {r.right} →
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full py-3.5 rounded-full bg-[#2E6F5E] text-[#FFFDF9] text-sm font-semibold tracking-wide"
                  >
                    See Your New Resume →
                  </button>
                </div>

                <div className="px-6 py-3.5 border-t border-[#24211D]/10 flex justify-around text-xs font-semibold text-[#6F665B]">
                  <span className="text-[#2E6F5E]">Tailor</span>
                  <span>Add AI</span>
                  <span>Talent</span>
                  <span>Profile</span>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STYLE 5: LUMINOUS BENTO DARK (MODERN CONSUMER DARK)          */}
            {/* ============================================================ */}
            {selected === "luminous" && (
              <div className="flex-1 bg-[#0F111A] text-white flex flex-col justify-between font-sans">
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FF8A65] to-[#F43F5E] flex items-center justify-center shadow-lg shadow-[#FF8A65]/20">
                        <TailorBot size={26} state="celebrating" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">AI Resume Tailor</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-[#34D399]">
                      ● Pass Active
                    </span>
                  </div>

                  {/* Glowing Arc Card */}
                  <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-5 text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-lg text-gray-400 font-semibold">58%</span>
                      <span className="text-[#FF8A65]">→</span>
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-[#FF8A65] to-[#34D399] bg-clip-text text-transparent">
                        92%
                      </span>
                    </div>
                    <RainbowArcGauge
                      colors={["#FF8A65", "#38BDF8", "#C084FC", "#34D399"]}
                      trackColor="rgba(255,255,255,0.08)"
                    />
                  </div>

                  {/* Bento 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { k: "6", label: "Upgrades", color: "#34D399" },
                      { k: "3", label: "AI Tools", color: "#FF8A65" },
                      { k: "14", label: "Keywords", color: "#38BDF8" },
                      { k: "≤2L", label: "Bullet Fit", color: "#C084FC" },
                    ].map((b) => (
                      <div
                        key={b.label}
                        className="rounded-2xl bg-white/[0.05] border border-white/10 p-3.5"
                      >
                        <div className="text-2xl font-extrabold" style={{ color: b.color }}>
                          {b.k}
                        </div>
                        <div className="text-xs text-gray-300 mt-0.5">{b.label}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#F43F5E] text-white font-bold text-sm shadow-lg shadow-[#F43F5E]/25"
                  >
                    Review Changes →
                  </button>
                </div>

                <div className="border-t border-white/10 px-6 py-3.5 flex justify-around text-xs font-medium text-gray-400">
                  <span className="text-white font-bold">Tailor</span>
                  <span>Add AI</span>
                  <span>Talent</span>
                  <span>Profile</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
