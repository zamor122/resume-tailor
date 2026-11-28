"use client";

import React from "react";
import {
  PRICING_FAQS,
  PRICING_TIERS,
  ROLE_CHIPS,
  SitePage,
  ViewportMode,
} from "./prototypeData";
import {
  ArcMetric,
  BrandTailorBot,
  IconName,
  InteractiveArcGauge,
  ProtoIcon,
  PrototypeAppState,
} from "./PrototypeShared";

const NAV_ITEMS: Array<{ id: SitePage; label: string; short: string; icon: IconName }> = [
  { id: "tailor", label: "Tailor", short: "TAILOR", icon: "sparkle" },
  { id: "futureproof", label: "Add AI", short: "ADD AI", icon: "ai" },
  { id: "talent", label: "Talent", short: "TALENT", icon: "talent" },
  { id: "pricing", label: "Passes", short: "PASSES", icon: "pricing" },
  { id: "profile", label: "Profile", short: "PROFILE", icon: "profile" },
];

function CoinIcon({
  icon,
  bg,
  size = 36,
}: {
  icon: IconName;
  bg: string;
  size?: number;
}) {
  return (
    <span
      className="rounded-full border-[1.75px] border-[#3A0C22] flex items-center justify-center shrink-0 shadow-[0_3px_0_#3A0C22]"
      style={{ backgroundColor: bg, width: size, height: size }}
    >
      <ProtoIcon name={icon} size={Math.round(size * 0.48)} color="#3A0C22" strokeWidth={2.2} />
    </span>
  );
}

export default function PomegranateSite({
  app,
  viewport,
}: {
  app: PrototypeAppState;
  viewport: ViewportMode;
}) {
  const isMobile = viewport === "mobile";
  const { persona } = app;

  const arcMetrics: ArcMetric[] = [
    {
      id: "keywords",
      label: "ATS Keywords",
      valueLabel: `${persona.keywordsMatched.length + persona.keywordsAdded.length}/${
        persona.keywordsMatched.length + persona.keywordsAdded.length + 1
      }`,
      pct: 0.93,
      color: "#F7B93E",
      complete: true,
    },
    {
      id: "bullets",
      label: "Bullets",
      valueLabel: `${app.approvedCount}/${persona.bullets.length}`,
      pct: Math.max(0.25, app.approvedCount / persona.bullets.length),
      color: "#7BC6FA",
      complete: app.approvedCount === persona.bullets.length,
    },
    {
      id: "ai",
      label: "AI Tools",
      valueLabel: `${app.selectedToolCount} verified`,
      pct: Math.min(0.95, 0.35 + app.selectedToolCount * 0.2),
      color: "#F284B6",
      complete: app.selectedToolCount >= 2,
    },
    {
      id: "fit",
      label: "1-Page Fit",
      valueLabel: "100%",
      pct: 0.92,
      color: "#74D4A0",
      complete: true,
    },
  ];

  const publicJsonPreview = JSON.stringify(
    {
      candidate_id: persona.publicId,
      verified_ai_fluent: true,
      role: persona.headline,
      region: persona.region,
      work_mode: persona.workMode,
      salary_floor: app.showSalaryFloor ? persona.compFloor : "disclosed_on_intro",
      verified_ai_tools: persona.futureproofTools
        .filter((t) => app.selectedToolIds[t.id])
        .map((t) => ({ name: t.name, standard: t.badge })),
      pii_included: false,
      intro_endpoint: `/api/talent/${persona.publicId}/intro-request`,
    },
    null,
    2
  );

  return (
    <div
      className={`min-h-full bg-[#FFFDF5] text-[#3A0C22] font-pom-sans flex flex-col relative selection:bg-[#EA375D]/20 ${
        isMobile ? "pb-24" : ""
      }`}
    >
      {/* ================================================================ */}
      {/* HEADER: MOBILE BERRY CURVED HERO vs DESKTOP EDITORIAL BERRY BAR  */}
      {/* ================================================================ */}
      {isMobile ? (
        <header className="relative bg-[#EA375D] pt-4 pb-11 px-4 overflow-hidden">
          {/* Decorative curved multi-stripe ribbon bands matching screenshot */}
          <svg
            viewBox="0 0 400 72"
            preserveAspectRatio="none"
            className="absolute bottom-0 inset-x-0 w-full h-14 pointer-events-none"
            aria-hidden="true"
          >
            <path d="M0 36 Q200 -4 400 36 L400 72 L0 72 Z" fill="#C9224A" />
            <path d="M0 44 Q200 6 400 44 L400 72 L0 72 Z" fill="#6F1536" />
            <path d="M0 51 Q200 15 400 51 L400 72 L0 72 Z" fill="#FFFDF5" />
          </svg>

          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => app.setActivePage("tailor")}
              aria-label="Go to Tailor Home"
              className="w-10 h-10 rounded-full bg-white border-[1.75px] border-[#3A0C22] flex items-center justify-center shadow-[0_2px_0_#3A0C22] active:translate-y-0.5 transition-transform"
            >
              <ProtoIcon name="home" size={18} color="#3A0C22" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => app.setActivePage("tailor")}
              className="font-pom-display font-bold text-[24px] tracking-tight text-white leading-none"
              style={{
                textShadow:
                  "0 2px 0 #3A0C22, 1.5px 0 0 #3A0C22, -1.5px 0 0 #3A0C22, 0 -1.5px 0 #3A0C22",
              }}
            >
              resume tailor
            </button>

            <button
              type="button"
              onClick={() => app.setActivePage("profile")}
              aria-label="Open Profile & Settings"
              className="w-10 h-10 rounded-full bg-white border-[1.75px] border-[#3A0C22] flex items-center justify-center shadow-[0_2px_0_#3A0C22] active:translate-y-0.5 transition-transform"
            >
              <ProtoIcon name="settings" size={18} color="#3A0C22" strokeWidth={2.2} />
            </button>
          </div>
        </header>
      ) : (
        <header className="relative bg-[#EA375D] border-b-[2px] border-[#3A0C22]">
          {/* Subtle decorative ribbon wave along bottom of desktop header */}
          <div className="h-1.5 w-full bg-[#C9224A] absolute bottom-0 inset-x-0" />
          <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4 relative z-10">
            {/* Brand + TailorBot Medallion */}
            <button
              type="button"
              onClick={() => app.setActivePage("tailor")}
              className="flex items-center gap-3 group focus-visible:outline-none"
            >
              <span className="w-11 h-11 rounded-full bg-[#FFFDF5] border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] flex items-center justify-center group-hover:scale-105 transition-transform">
                <BrandTailorBot theme="pomegranate" state={app.botState} size={34} />
              </span>
              <span
                className="font-pom-display font-bold text-2xl tracking-tight text-white"
                style={{
                  textShadow:
                    "0 2px 0 #3A0C22, 1.5px 0 0 #3A0C22, -1.5px 0 0 #3A0C22, 0 -1.5px 0 #3A0C22",
                }}
              >
                resume tailor
              </span>
            </button>

            {/* Floating White Pill Navigation (Semantic <nav> with aria-current="page") */}
            <nav
              aria-label="Pomegranate primary navigation"
              className="bg-white border-[2px] border-[#3A0C22] rounded-full p-1.5 flex items-center gap-1 shadow-[0_3px_0_#3A0C22]"
            >
              {NAV_ITEMS.map((item) => {
                const active = app.activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => app.setActivePage(item.id)}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A0C22] ${
                      active
                        ? "bg-[#F6F1E4] text-[#3A0C22]"
                        : "text-[#7D4D61] hover:text-[#3A0C22] hover:bg-[#FFFDF5]"
                    }`}
                  >
                    <ProtoIcon
                      name={item.icon}
                      size={14}
                      color={active ? "#EA375D" : "#7D4D61"}
                      strokeWidth={2.3}
                    />
                    <span>{item.label}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA375D] border-[1.75px] border-[#3A0C22]"
                      />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                aria-current={app.activePage === "agents" ? "page" : undefined}
                onClick={() => app.setActivePage("agents")}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  app.activePage === "agents"
                    ? "bg-[#F6F1E4] text-[#3A0C22]"
                    : "text-[#7D4D61] hover:text-[#3A0C22]"
                }`}
              >
                <ProtoIcon name="agents" size={14} color={app.activePage === "agents" ? "#EA375D" : "#7D4D61"} />
                <span>API</span>
                {app.activePage === "agents" && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA375D] border-[1.75px] border-[#3A0C22]"
                  />
                )}
              </button>
            </nav>

            {/* Right Actions: Pass Pill + Quick Export */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={app.togglePassTier}
                className="px-3.5 py-2 rounded-full bg-[#FFFDF5] border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22] text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#F6F1E4] transition-colors"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    app.hasPass ? "bg-[#128C66]" : "bg-[#F7B93E]"
                  }`}
                />
                <span>{app.hasPass ? app.activePassLabel : "Free Tier"}</span>
              </button>
              <button
                type="button"
                onClick={() => app.setExportModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#F7B93E] text-[#3A0C22] border-[1.75px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] active:translate-y-0.5 text-xs font-extrabold flex items-center gap-1.5 transition-transform"
              >
                <ProtoIcon name="download" size={14} color="#3A0C22" strokeWidth={2.4} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ================================================================ */}
      {/* MAIN CONTENT AREA                                                */}
      {/* ================================================================ */}
      <main
        className={`flex-1 w-full mx-auto ${
          isMobile ? "px-4 pb-6" : "max-w-6xl px-6 py-8"
        }`}
      >
        {/* -------------------------------------------------------------- */}
        {/* PAGE 1: TAILOR STUDIO (HOME)                                   */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "tailor" && (
          <div className="space-y-6">
            {/* MOBILE OVERLAPPING PILL MEDALLION (Directly inspired by screenshot!) */}
            {isMobile && (
              <div className="-mt-8 relative z-20">
                <div className="bg-white border-[2px] border-[#3A0C22] rounded-full p-1.5 flex items-center justify-between shadow-[0_4px_0_#3A0C22]">
                  <div className="flex-1 bg-[#F6F1E4] rounded-l-full py-2.5 pl-4 pr-2 text-center">
                    <div className="text-[24px] font-extrabold leading-none tracking-tight">
                      {persona.baseScore}%
                    </div>
                    <div className="text-[11px] font-semibold text-[#7D4D61] mt-1">
                      Before Score
                    </div>
                  </div>

                  <div className="w-[74px] h-[74px] -my-5 -mx-2 rounded-full bg-[#EA375D] border-[2px] border-[#3A0C22] shadow-[0_5px_0_#3A0C22] flex items-center justify-center shrink-0 z-10">
                    <div className="w-[58px] h-[58px] rounded-full bg-[#FFFDF5] border-[1.75px] border-[#3A0C22] flex items-center justify-center">
                      <BrandTailorBot
                        theme="pomegranate"
                        state={app.botState}
                        size={44}
                        onPoke={app.pokeBot}
                      />
                    </div>
                  </div>

                  <div className="flex-1 bg-[#F6F1E4] rounded-r-full py-2.5 pr-4 pl-2 text-center">
                    <div className="text-[24px] font-extrabold text-[#128C66] leading-none tracking-tight">
                      {app.liveScore}%
                    </div>
                    <div className="text-[11px] font-semibold text-[#7D4D61] mt-1">
                      +{app.liveScore - persona.baseScore} Match
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Studio Mode Switcher: New Tailor Input vs Match Results */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1
                  className={`font-pom-display font-bold tracking-tight ${
                    isMobile ? "text-xl" : "text-3xl"
                  }`}
                >
                  {app.tailorView === "results"
                    ? `${persona.targetRole}`
                    : "Tailor your resume in 15 seconds"}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#7D4D61] mt-0.5">
                  {app.tailorView === "results"
                    ? `${persona.targetCompany} · ${app.approvedCount} of ${persona.bullets.length} upgrades approved`
                    : "Drop your resume & target job. Zero fluff, same 1-page fit."}
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Tailor workspace mode"
                className="inline-flex bg-white border-[1.75px] border-[#3A0C22] rounded-full p-1 shadow-[0_2px_0_#3A0C22]"
              >
                {(
                  [
                    { id: "results", label: "Match & Diff" },
                    { id: "input", label: "New Tailor" },
                  ] as const
                ).map((t) => {
                  const selected = app.tailorView === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => app.setTailorView(t.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        selected
                          ? "bg-[#EA375D] text-white border border-[#3A0C22]"
                          : "text-[#7D4D61] hover:text-[#3A0C22]"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INPUT WORKFLOW */}
            {app.tailorView === "input" ? (
              <div
                className={`grid gap-5 ${
                  isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
                }`}
              >
                <div className={isMobile ? "space-y-4" : "col-span-7 space-y-4"}>
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
                    <div className="bg-[#F6F1E4] px-5 py-3 border-b border-[#3A0C22]/15 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide">
                        1 · Your Current Resume
                      </span>
                      <span className="text-[11px] font-bold text-[#128C66] bg-[#E6F7EF] px-2.5 py-0.5 rounded-full border border-[#3A0C22]/20">
                        PDF · DOCX · Paste
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="rounded-2xl border-2 border-dashed border-[#3A0C22]/30 bg-[#FFFDF5] p-4 text-xs leading-relaxed text-[#3A0C22]">
                        {persona.sampleResumeSnippet}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#7D4D61]">
                        <span>{persona.privateName} · 1 page detected</span>
                        <span className="text-[#EA375D] font-bold">✓ Ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
                    <div className="bg-[#F6F1E4] px-5 py-3 border-b border-[#3A0C22]/15 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide">
                        2 · Target Job Description
                      </span>
                      <span className="text-[11px] font-bold text-[#7D4D61]">
                        URL or Paste
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="rounded-2xl border border-[#3A0C22]/20 bg-[#FFFDF5] p-4 text-xs leading-relaxed text-[#3A0C22]">
                        {persona.sampleJobSnippet}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={isMobile ? "space-y-4" : "col-span-5 space-y-4"}>
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] p-5 shadow-[0_4px_0_#3A0C22] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-[#F6F1E4] border-[2px] border-[#3A0C22] flex items-center justify-center shrink-0">
                        <BrandTailorBot
                          theme="pomegranate"
                          state={app.isTailoring ? "scanning" : "idle"}
                          size={44}
                          onPoke={app.pokeBot}
                        />
                      </div>
                      <div>
                        <p className="font-pom-display font-bold text-base">
                          Tailoring Style
                        </p>
                        <p className="text-xs text-[#7D4D61]">
                          Choose how TailorBot rewrites your bullets
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: "xyz", label: "Impact X-Y-Z" },
                          { id: "concise", label: "Strict ≤2L" },
                          { id: "ats", label: "ATS Max" },
                        ] as const
                      ).map((p) => {
                        const active = app.tonePreset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => app.setTonePreset(p.id)}
                            className={`py-2.5 px-2 rounded-2xl border-[1.75px] text-xs font-extrabold transition-all ${
                              active
                                ? "bg-[#F7B93E] border-[#3A0C22] text-[#3A0C22] shadow-[0_3px_0_#3A0C22]"
                                : "bg-[#FFFDF5] border-[#3A0C22]/20 text-[#7D4D61] hover:border-[#3A0C22]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={app.runTailorDemo}
                      disabled={app.isTailoring}
                      className="w-full py-3.5 rounded-full bg-[#EA375D] text-white border-[2px] border-[#3A0C22] shadow-[0_4px_0_#3A0C22] active:translate-y-0.5 font-extrabold text-sm flex items-center justify-center gap-2 transition-transform disabled:opacity-70"
                    >
                      <ProtoIcon name="sparkle" size={16} color="#FFFDF5" />
                      <span>
                        {app.isTailoring
                          ? "TailorBot scanning keywords..."
                          : "Tailor My Resume →"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* RESULTS WORKFLOW: 2-COL ON DESKTOP, STACKED ON MOBILE */
              <div
                className={`grid gap-6 ${
                  isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
                }`}
              >
                {/* LEFT COLUMN: SCORE MEDALLION + RAINBOW ARC + 3D COIN SUMMARY */}
                <div className={isMobile ? "space-y-5" : "col-span-5 space-y-5"}>
                  {/* Desktop Overlapping Pill Score Card */}
                  {!isMobile && (
                    <div className="bg-white border-[2px] border-[#3A0C22] rounded-full p-2 flex items-center justify-between shadow-[0_4px_0_#3A0C22]">
                      <div className="flex-1 bg-[#F6F1E4] rounded-l-full py-3 pl-5 pr-2 text-center">
                        <div className="text-3xl font-extrabold leading-none">
                          {persona.baseScore}%
                        </div>
                        <div className="text-[11px] font-bold text-[#7D4D61] mt-1">
                          Before
                        </div>
                      </div>

                      <div className="w-20 h-20 -my-5 -mx-2 rounded-full bg-[#EA375D] border-[2px] border-[#3A0C22] shadow-[0_5px_0_#3A0C22] flex items-center justify-center shrink-0 z-10">
                        <div className="w-16 h-16 rounded-full bg-[#FFFDF5] border-[1.75px] border-[#3A0C22] flex items-center justify-center">
                          <BrandTailorBot
                            theme="pomegranate"
                            state={app.botState}
                            size={48}
                            onPoke={app.pokeBot}
                          />
                        </div>
                      </div>

                      <div className="flex-1 bg-[#F6F1E4] rounded-r-full py-3 pr-5 pl-2 text-center">
                        <div className="text-3xl font-extrabold text-[#128C66] leading-none">
                          {app.liveScore}%
                        </div>
                        <div className="text-[11px] font-bold text-[#7D4D61] mt-1">
                          +{app.liveScore - persona.baseScore} Match
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Concentric Rainbow Arc Card */}
                  <div className="bg-[#FFFDF5] pt-2 pb-1 text-center space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="w-8 h-8 rounded-full bg-[#F6F1E4] border border-[#3A0C22]/15 flex items-center justify-center">
                        <ProtoIcon name="layers" size={14} color="#7D4D61" />
                      </span>
                      <span className="text-sm font-extrabold text-[#3A0C22]">
                        How your resume compares
                      </span>
                      <button
                        type="button"
                        onClick={app.pokeBot}
                        aria-label="Hear a TailorBot tip"
                        className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#3A0C22] flex items-center justify-center hover:bg-[#F6F1E4]"
                      >
                        <ProtoIcon name="sparkle" size={14} color="#EA375D" />
                      </button>
                    </div>

                    <InteractiveArcGauge
                      theme="pomegranate"
                      metrics={arcMetrics}
                      selectedId={app.selectedArcId}
                      onSelect={app.setSelectedArcId}
                      compact={isMobile}
                    />
                  </div>

                  {/* Signature Pomegranate 4-Row Summary Card (Zero Text Clutter!) */}
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
                    <div className="bg-[#F6F1E4] px-5 py-3 text-center text-xs font-extrabold text-[#3A0C22] border-b border-[#3A0C22]/15">
                      Ready to apply · {persona.shortLabel}
                    </div>
                    {(
                      [
                        {
                          icon: "bolt" as IconName,
                          bg: "#F7B93E",
                          label: "ATS Keywords",
                          val: `${persona.keywordsMatched.length + persona.keywordsAdded.length} / ${
                            persona.keywordsMatched.length + persona.keywordsAdded.length + 1
                          }`,
                          onClick: () => app.setSelectedArcId("keywords"),
                        },
                        {
                          icon: "sparkle" as IconName,
                          bg: "#7BC6FA",
                          label: "Bullets Upgraded",
                          val: `${app.approvedCount} / ${persona.bullets.length}`,
                          onClick: () => app.setSelectedArcId("bullets"),
                        },
                        {
                          icon: "ai" as IconName,
                          bg: "#F284B6",
                          label: "Verified AI Tools",
                          val: `${app.selectedToolCount} added`,
                          onClick: () => app.setActivePage("futureproof"),
                        },
                        {
                          icon: "talent" as IconName,
                          bg: "#74D4A0",
                          label: "AI Talent Pool",
                          val: app.discoveryOn ? "Live" : "Paused",
                          onClick: () => app.setActivePage("talent"),
                        },
                      ]
                    ).map((row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={row.onClick}
                        className="w-full px-4 py-3.5 flex items-center justify-between border-b last:border-b-0 border-[#3A0C22]/10 hover:bg-[#FFFDF5] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <CoinIcon icon={row.icon} bg={row.bg} size={34} />
                          <span className="text-sm font-bold text-[#3A0C22]">
                            {row.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-extrabold text-[#3A0C22]">
                            {row.val}
                          </span>
                          <span className="w-7 h-7 rounded-full border border-[#3A0C22]/25 flex items-center justify-center">
                            <ProtoIcon name="arrow" size={13} color="#3A0C22" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE DIFF APPROVAL STUDIO */}
                <div className={isMobile ? "space-y-4" : "col-span-7 space-y-4"}>
                  {/* TailorBot Speech Pill */}
                  <div className="bg-[#F6F1E4] border-[1.75px] border-[#3A0C22] rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <BrandTailorBot
                        theme="pomegranate"
                        state={app.botState}
                        size={36}
                        onPoke={app.pokeBot}
                      />
                      <div>
                        <p className="text-xs font-extrabold text-[#3A0C22]">
                          TailorBot says: &ldquo;{app.getBotQuip("pomegranate")}&rdquo;
                        </p>
                        <p className="text-[11px] font-semibold text-[#7D4D61]">
                          Tap any bullet below to approve or keep your original.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => app.setExportModalOpen(true)}
                      className="shrink-0 px-3.5 py-2 rounded-full bg-[#EA375D] text-white border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22] text-xs font-extrabold"
                    >
                      Export →
                    </button>
                  </div>

                  {/* Interactive Bullet Cards */}
                  <div className="space-y-3">
                    {persona.bullets.map((b, index) => {
                      const approved = Boolean(app.approvedBullets[b.id]);
                      const whyOpen = app.expandedWhyId === b.id;
                      return (
                        <article
                          key={b.id}
                          className={`rounded-[24px] border-[2px] border-[#3A0C22] overflow-hidden transition-all ${
                            approved
                              ? "bg-white shadow-[0_4px_0_#3A0C22]"
                              : "bg-[#FFFDF5] opacity-80"
                          }`}
                        >
                          <div className="bg-[#F6F1E4] px-4 py-2.5 flex items-center justify-between gap-2 border-b border-[#3A0C22]/12">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-[#7BC6FA] border-[1.5px] border-[#3A0C22] text-[11px] font-extrabold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-xs font-extrabold">
                                {b.section}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#3A0C22]/20 text-[#7D4D61]">
                                {b.lineBadge}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-extrabold text-[#128C66]">
                                +{b.scoreGain}%
                              </span>
                              <button
                                type="button"
                                onClick={() => app.toggleBullet(b.id)}
                                className={`px-3 py-1 rounded-full text-[11px] font-extrabold border-[1.5px] border-[#3A0C22] transition-colors ${
                                  approved
                                    ? "bg-[#74D4A0] text-[#3A0C22]"
                                    : "bg-white text-[#7D4D61]"
                                }`}
                              >
                                {approved ? "✓ Approved" : "Approve"}
                              </button>
                            </div>
                          </div>

                          <div className="p-4 space-y-2.5">
                            <p className="text-xs text-[#7D4D61] line-through decoration-[#EA375D]/60">
                              {b.before}
                            </p>
                            <p className="text-sm font-semibold text-[#3A0C22] leading-snug">
                              {b.after}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex flex-wrap gap-1.5">
                                {b.addedKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="px-2.5 py-0.5 rounded-full bg-[#FFF3D6] border border-[#3A0C22]/20 text-[11px] font-bold text-[#3A0C22]"
                                  >
                                    + {kw}
                                  </span>
                                ))}
                              </div>

                              <button
                                type="button"
                                aria-expanded={whyOpen}
                                onClick={() =>
                                  app.setExpandedWhyId(whyOpen ? null : b.id)
                                }
                                className="text-[11px] font-extrabold text-[#EA375D] hover:underline"
                              >
                                {whyOpen ? "Hide rationale" : "Why this works?"}
                              </button>
                            </div>

                            {whyOpen && (
                              <div className="mt-2 rounded-2xl bg-[#F6F1E4] px-3.5 py-2.5 text-xs text-[#3A0C22] border border-[#3A0C22]/15">
                                {b.why}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Keywords Ribbon */}
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[24px] p-4 shadow-[0_3px_0_#3A0C22] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">
                        Added ATS Keywords
                      </span>
                      <span className="text-[11px] font-bold text-[#7D4D61]">
                        1 optional left: {persona.missingKeywordHint}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {persona.keywordsAdded.map((kw) => (
                        <span
                          key={kw}
                          className="px-3 py-1 rounded-full bg-[#E6F7EF] border border-[#3A0C22]/25 text-xs font-bold text-[#125D44]"
                        >
                          ✓ {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 2: FUTUREPROOF (ADD VERIFIED AI EXPERIENCE)               */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "futureproof" && (
          <div className="space-y-6">
            <div className={isMobile ? "-mt-5 relative z-20" : ""}>
              <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] p-5 shadow-[0_4px_0_#3A0C22] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDE7EE] border border-[#3A0C22]/25 text-[11px] font-extrabold text-[#C41E46]">
                    <ProtoIcon name="shield" size={13} color="#C41E46" />
                    <span>Timeline Protected · 2023–Present Only</span>
                  </div>
                  <h1 className="font-pom-display font-bold text-2xl sm:text-3xl">
                    Add Real AI Experience
                  </h1>
                  <p className="text-xs sm:text-sm text-[#7D4D61] font-medium">
                    Pick industry-standard tools for your role. Get truthful bullets + 30s interview scripts.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#F6F1E4] px-4 py-2.5 rounded-full border-[1.75px] border-[#3A0C22]">
                  <CoinIcon icon="ai" bg="#F284B6" size={34} />
                  <div>
                    <div className="text-base font-extrabold leading-none">
                      {app.selectedToolCount} Active
                    </div>
                    <div className="text-[11px] font-semibold text-[#7D4D61]">
                      {persona.roleBadge}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Filter Chips (Single horizontal scrollable row) */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ROLE_CHIPS.map((chip) => {
                const active = app.selectedRoleChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => app.setSelectedRoleChip(chip.id)}
                    className={`shrink-0 px-4 py-2 rounded-full border-[1.75px] text-xs font-extrabold transition-all ${
                      active
                        ? "bg-[#EA375D] text-white border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
                        : "bg-white text-[#3A0C22] border-[#3A0C22]/25 hover:border-[#3A0C22]"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div
              className={`grid gap-6 ${
                isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
              }`}
            >
              {/* Tool Picker Cards */}
              <div className={isMobile ? "space-y-3" : "col-span-6 space-y-3"}>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7D4D61] px-1">
                  Tap tools to weave into your resume
                </h2>
                {persona.futureproofTools.map((tool, idx) => {
                  const selected = Boolean(app.selectedToolIds[tool.id]);
                  const coinColors = ["#F7B93E", "#7BC6FA", "#F284B6", "#74D4A0"];
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => app.toggleTool(tool.id)}
                      className={`w-full text-left rounded-[24px] border-[2px] border-[#3A0C22] p-4 transition-all flex items-start justify-between gap-3 ${
                        selected
                          ? "bg-white shadow-[0_4px_0_#3A0C22]"
                          : "bg-[#FFFDF5] opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <CoinIcon
                          icon="ai"
                          bg={coinColors[idx % coinColors.length]}
                          size={38}
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm">
                              {tool.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#F6F1E4] border border-[#3A0C22]/20 text-[10px] font-bold">
                              {tool.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[#7D4D61] leading-snug">
                            {tool.oneLiner}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-7 h-7 rounded-full border-[1.75px] border-[#3A0C22] flex items-center justify-center shrink-0 mt-0.5 ${
                          selected ? "bg-[#74D4A0]" : "bg-white"
                        }`}
                      >
                        {selected && (
                          <ProtoIcon name="check" size={14} color="#3A0C22" strokeWidth={2.8} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Generated Bullets + 30-Second Interview Scripts */}
              <div className={isMobile ? "space-y-4" : "col-span-6 space-y-4"}>
                <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
                  <div className="bg-[#F6F1E4] px-5 py-3 border-b border-[#3A0C22]/15 flex items-center justify-between">
                    <span className="text-xs font-extrabold">
                      Live Resume Bullets ({app.selectedToolCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        app.triggerToast("AI bullets synced to Tailor Studio");
                        app.setActivePage("tailor");
                      }}
                      className="text-xs font-extrabold text-[#EA375D] hover:underline"
                    >
                      Apply to Resume →
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {persona.futureproofTools
                      .filter((t) => app.selectedToolIds[t.id])
                      .map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl bg-[#FFFDF5] border border-[#3A0C22]/15 p-3.5 text-xs font-semibold leading-relaxed"
                        >
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-[#128C66] mb-1">
                            {t.name} · {t.category}
                          </span>
                          <p>{t.generatedBullet}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 30-Second Spoken Interview Scripts with Interactive Countdown */}
                <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
                  <div className="bg-[#F6F1E4] px-5 py-3 border-b border-[#3A0C22]/15 flex items-center justify-between">
                    <span className="text-xs font-extrabold">
                      30-Second Interview Scripts
                    </span>
                    <span className="text-[11px] font-bold text-[#7D4D61]">
                      Sound natural, never robotic
                    </span>
                  </div>
                  <div className="divide-y divide-[#3A0C22]/10">
                    {persona.futureproofTools
                      .filter((t) => app.selectedToolIds[t.id])
                      .slice(0, 2)
                      .map((t) => {
                        const running = app.activeTimerToolId === t.id;
                        return (
                          <div key={t.id} className="p-4 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-extrabold text-[#EA375D]">
                                Q: &ldquo;{t.scriptQuestion}&rdquo;
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  running
                                    ? app.stopScriptTimer()
                                    : app.startScriptTimer(t.id)
                                }
                                className={`shrink-0 px-3 py-1 rounded-full border-[1.5px] border-[#3A0C22] text-[11px] font-extrabold flex items-center gap-1 ${
                                  running
                                    ? "bg-[#EA375D] text-white"
                                    : "bg-[#F7B93E] text-[#3A0C22]"
                                }`}
                              >
                                <ProtoIcon
                                  name="timer"
                                  size={12}
                                  color={running ? "#FFFDF5" : "#3A0C22"}
                                />
                                <span>
                                  {running ? `${app.timerSeconds}s · Stop` : "Practice 30s"}
                                </span>
                              </button>
                            </div>
                            <p className="text-xs leading-relaxed text-[#3A0C22] bg-[#FFFDF5] rounded-2xl p-3 border border-[#3A0C22]/12">
                              &ldquo;{t.script30s}&rdquo;
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 3: AGENT TALENT NETWORK (REVERSE JOB BOARD)               */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "talent" && (
          <div className="space-y-6">
            <div className={isMobile ? "-mt-5 relative z-20" : ""}>
              <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] p-5 shadow-[0_4px_0_#3A0C22] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F7EF] border border-[#3A0C22]/25 text-[11px] font-extrabold text-[#125D44]">
                    <ProtoIcon name="shield" size={13} color="#125D44" />
                    <span>Zero PII · Double Opt-In Only</span>
                  </span>
                  <h1 className="font-pom-display font-bold text-2xl sm:text-3xl">
                    Let AI Recruiters Find You
                  </h1>
                  <p className="text-xs sm:text-sm text-[#7D4D61] font-medium">
                    Anonymous talent pool is free. Shareable LinkedIn Agent Card unlocks with any Pass.
                  </p>
                </div>

                {/* Sub-view Tablist */}
                <div
                  role="tablist"
                  aria-label="Talent network views"
                  className="flex gap-1.5 bg-[#F6F1E4] p-1.5 rounded-full border-[1.75px] border-[#3A0C22] overflow-x-auto"
                >
                  {(
                    [
                      { id: "controls", label: "1. Controls" },
                      { id: "card", label: "2. LinkedIn Card" },
                      { id: "inbox", label: "3. Intro Inbox (1)" },
                    ] as const
                  ).map((t) => {
                    const selected = app.talentTab === t.id;
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        type="button"
                        aria-selected={selected}
                        onClick={() => app.setTalentTab(t.id)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors ${
                          selected
                            ? "bg-[#EA375D] text-white border border-[#3A0C22]"
                            : "text-[#7D4D61] hover:text-[#3A0C22]"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SUB-TAB 1: CANDIDATE PRIVACY CONTROLS */}
            {app.talentTab === "controls" && (
              <div
                className={`grid gap-5 ${
                  isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
                }`}
              >
                <div className={isMobile ? "space-y-4" : "col-span-7 space-y-4"}>
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
                    <div className="bg-[#F6F1E4] px-5 py-3 border-b border-[#3A0C22]/15 flex items-center justify-between">
                      <span className="text-xs font-extrabold">
                        Privacy & Discovery Settings
                      </span>
                      <button
                        type="button"
                        onClick={app.togglePassTier}
                        className="text-[11px] font-extrabold text-[#EA375D] hover:underline"
                      >
                        Simulate: {app.hasPass ? "★ Pass Active" : "Free Tier"}
                      </button>
                    </div>

                    <div className="divide-y divide-[#3A0C22]/10">
                      {/* Discovery Switch */}
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CoinIcon icon="talent" bg="#74D4A0" size={36} />
                          <div>
                            <div className="text-sm font-extrabold">
                              AI Recruiting Discovery
                            </div>
                            <div className="text-xs text-[#7D4D61]">
                              {app.discoveryOn
                                ? "Visible anonymously to verified hiring agents"
                                : "Paused — hidden from all agent searches"}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={app.discoveryOn}
                          onClick={() => app.setDiscoveryOn(!app.discoveryOn)}
                          className={`px-4 py-1.5 rounded-full border-[1.75px] border-[#3A0C22] text-xs font-extrabold shadow-[0_2px_0_#3A0C22] ${
                            app.discoveryOn
                              ? "bg-[#74D4A0] text-[#3A0C22]"
                              : "bg-[#F6F1E4] text-[#7D4D61]"
                          }`}
                        >
                          {app.discoveryOn ? "ON" : "PAUSED"}
                        </button>
                      </div>

                      {/* Blocked Employer Domain */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="pom-blocked-domain"
                            className="text-sm font-extrabold"
                          >
                            Block Current Employer Domain
                          </label>
                          <span className="text-[11px] font-bold text-[#128C66]">
                            Stealth Guard Active
                          </span>
                        </div>
                        <input
                          id="pom-blocked-domain"
                          type="text"
                          value={app.blockedDomain}
                          onChange={(e) => app.setBlockedDomain(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl bg-[#FFFDF5] border-[1.75px] border-[#3A0C22]/30 focus:border-[#3A0C22] focus:outline-none text-sm font-semibold"
                        />
                        <p className="text-[11px] text-[#7D4D61]">
                          Requests from @{app.blockedDomain || "company.com"} are silently dropped without tipping them off.
                        </p>
                      </div>

                      {/* Salary Floor */}
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CoinIcon icon="pricing" bg="#F7B93E" size={36} />
                          <div>
                            <div className="text-sm font-extrabold">
                              Show Salary Floor ({persona.compFloor})
                            </div>
                            <div className="text-xs text-[#7D4D61]">
                              Filters out lowball intros automatically
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={app.showSalaryFloor}
                          onClick={() =>
                            app.setShowSalaryFloor(!app.showSalaryFloor)
                          }
                          className={`px-3.5 py-1.5 rounded-full border-[1.75px] border-[#3A0C22] text-xs font-extrabold ${
                            app.showSalaryFloor
                              ? "bg-[#F7B93E] text-[#3A0C22]"
                              : "bg-white text-[#7D4D61]"
                          }`}
                        >
                          {app.showSalaryFloor ? "Shown" : "Hidden"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Activity & LinkedIn Share Card */}
                <div className={isMobile ? "space-y-4" : "col-span-5 space-y-4"}>
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] p-5 shadow-[0_4px_0_#3A0C22] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#7D4D61]">
                        This Week&apos;s Pulse
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E6F7EF] text-[#125D44] text-[11px] font-extrabold">
                        ● Live
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#F6F1E4] p-3.5 text-center border border-[#3A0C22]/15">
                        <div className="text-3xl font-extrabold">
                          {persona.agentSearchesWeek}
                        </div>
                        <div className="text-[11px] font-bold text-[#7D4D61] mt-0.5">
                          Agent Matches
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#F6F1E4] p-3.5 text-center border border-[#3A0C22]/15">
                        <div className="text-3xl font-extrabold text-[#EA375D]">
                          {persona.cardViewsWeek}
                        </div>
                        <div className="text-[11px] font-bold text-[#7D4D61] mt-0.5">
                          Card Views
                        </div>
                      </div>
                    </div>

                    {/* Premium LinkedIn Shareable Link */}
                    <div className="rounded-2xl bg-[#FFFDF5] border-[1.75px] border-[#3A0C22] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold">
                          LinkedIn Agent Link
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F7B93E] border border-[#3A0C22]">
                          {app.hasPass ? "★ UNLOCKED" : "PASS FEATURE"}
                        </span>
                      </div>
                      {app.hasPass ? (
                        <>
                          <div className="px-3 py-2 rounded-xl bg-[#F6F1E4] text-xs font-mono font-bold truncate">
                            airesumetailor.com/t/{persona.publicId}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                app.triggerToast("LinkedIn Agent Card URL copied!")
                              }
                              className="flex-1 py-2 rounded-full bg-[#3A0C22] text-white text-xs font-extrabold"
                            >
                              Copy Link
                            </button>
                            <button
                              type="button"
                              onClick={() => app.setTalentTab("card")}
                              className="flex-1 py-2 rounded-full bg-white border-[1.75px] border-[#3A0C22] text-xs font-extrabold"
                            >
                              Preview →
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => app.setActivePage("pricing")}
                          className="w-full py-2.5 rounded-full bg-[#EA375D] text-white border-[1.75px] border-[#3A0C22] text-xs font-extrabold shadow-[0_2px_0_#3A0C22]"
                        >
                          Unlock with $9 Pass →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: SHAREABLE LINKEDIN AGENT CARD */}
            {app.talentTab === "card" && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[#7D4D61]">
                    Public URL: airesumetailor.com/t/{persona.publicId}
                  </span>
                  <div className="inline-flex bg-white border-[1.75px] border-[#3A0C22] rounded-full p-1">
                    <button
                      type="button"
                      onClick={() => app.setCardViewMode("human")}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                        app.cardViewMode === "human"
                          ? "bg-[#3A0C22] text-white"
                          : "text-[#7D4D61]"
                      }`}
                    >
                      <ProtoIcon
                        name="eye"
                        size={12}
                        color={app.cardViewMode === "human" ? "#FFFDF5" : "#7D4D61"}
                      />
                      <span>Recruiter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => app.setCardViewMode("json")}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                        app.cardViewMode === "json"
                          ? "bg-[#3A0C22] text-white"
                          : "text-[#7D4D61]"
                      }`}
                    >
                      <ProtoIcon
                        name="code"
                        size={12}
                        color={app.cardViewMode === "json" ? "#FFFDF5" : "#7D4D61"}
                      />
                      <span>AI Agent JSON</span>
                    </button>
                  </div>
                </div>

                {app.cardViewMode === "human" ? (
                  <div className="bg-white border-[2px] border-[#3A0C22] rounded-[28px] overflow-hidden shadow-[0_5px_0_#3A0C22]">
                    <div className="bg-[#EA375D] text-white p-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-white text-[#3A0C22] text-[10px] font-extrabold border border-[#3A0C22]">
                          ✓ VERIFIED AI-FLUENT · ANONYMOUS ID {persona.publicId}
                        </span>
                        <h2 className="font-pom-display font-bold text-xl sm:text-2xl mt-2">
                          {persona.headline}
                        </h2>
                        <p className="text-xs text-white/90 font-semibold mt-0.5">
                          {persona.yearsExperience}+ yrs · {persona.workMode} ·{" "}
                          {persona.region}
                          {app.showSalaryFloor ? ` · Target ${persona.compFloor}` : ""}
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-[#FFFDF5] border-[2px] border-[#3A0C22] flex items-center justify-center">
                        <BrandTailorBot theme="pomegranate" state="celebrating" size={42} />
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {persona.futureproofTools
                          .filter((t) => app.selectedToolIds[t.id])
                          .map((t) => (
                            <span
                              key={t.id}
                              className="px-3 py-1 rounded-full bg-[#FDE7EE] border border-[#3A0C22]/25 text-xs font-extrabold text-[#3A0C22]"
                            >
                              ✦ {t.name}
                            </span>
                          ))}
                      </div>

                      <div className="space-y-2">
                        {persona.anonymizedHighlights.map((h, i) => (
                          <div
                            key={i}
                            className="rounded-2xl bg-[#FFFDF5] border border-[#3A0C22]/15 px-4 py-3 text-xs font-medium leading-relaxed"
                          >
                            {h}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => app.setIntroModalOpen(true)}
                        className="w-full py-3.5 rounded-full bg-[#EA375D] text-white border-[2px] border-[#3A0C22] shadow-[0_4px_0_#3A0C22] active:translate-y-0.5 font-extrabold text-sm transition-transform"
                      >
                        Request Double-Opt-In Intro →
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="bg-[#2A0A19] text-[#FFFDF5] border-[2px] border-[#3A0C22] rounded-[24px] p-5 text-xs font-mono overflow-x-auto leading-relaxed shadow-[0_4px_0_#3A0C22]">
                    {publicJsonPreview}
                  </pre>
                )}
              </div>
            )}

            {/* SUB-TAB 3: DOUBLE-OPT-IN INTRO INBOX */}
            {app.talentTab === "inbox" && (
              <div className="max-w-2xl mx-auto bg-white border-[2px] border-[#3A0C22] rounded-[28px] overflow-hidden shadow-[0_5px_0_#3A0C22]">
                <div className="bg-[#F6F1E4] px-5 py-3.5 border-b border-[#3A0C22]/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CoinIcon icon="mail" bg="#7BC6FA" size={30} />
                    <span className="text-xs font-extrabold">
                      New Verified Intro Request
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#128C66]">
                    Domain Verified ✓
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-pom-display font-bold text-xl">
                        {persona.sampleIntro.company}
                      </h2>
                      <p className="text-xs font-bold text-[#7D4D61]">
                        {persona.sampleIntro.roleTitle} · {persona.sampleIntro.workMode}
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-[#E6F7EF] border border-[#3A0C22]/25 text-xs font-extrabold text-[#125D44]">
                      {persona.sampleIntro.compRange}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#FFFDF5] border border-[#3A0C22]/15 p-4 text-xs leading-relaxed">
                    &ldquo;{persona.sampleIntro.pitch}&rdquo;
                    <div className="mt-2 font-bold text-[#7D4D61]">
                      — {persona.sampleIntro.recruiterName}
                    </div>
                  </div>

                  {app.inboxDecision === "pending" && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          app.setInboxDecision("accepted");
                          app.triggerToast("Contact shared — intro email sent!");
                        }}
                        className="flex-1 py-3 rounded-full bg-[#74D4A0] text-[#3A0C22] border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] text-xs font-extrabold"
                      >
                        ✓ Accept & Share Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => app.setInboxDecision("declined")}
                        className="px-5 py-3 rounded-full bg-white text-[#7D4D61] border-[1.75px] border-[#3A0C22]/30 text-xs font-extrabold"
                      >
                        Decline Silently
                      </button>
                    </div>
                  )}

                  {app.inboxDecision === "accepted" && (
                    <div className="rounded-2xl bg-[#E6F7EF] border-[1.75px] border-[#128C66] p-4 text-xs font-bold text-[#125D44] flex items-center justify-between">
                      <span>
                        ✓ Connected! Both you and {persona.sampleIntro.company} received the intro email.
                      </span>
                      <button
                        type="button"
                        onClick={() => app.setInboxDecision("pending")}
                        className="underline ml-2"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  {app.inboxDecision === "declined" && (
                    <div className="rounded-2xl bg-[#F6F1E4] border border-[#3A0C22]/20 p-4 text-xs font-bold text-[#7D4D61] flex items-center justify-between">
                      <span>
                        Closed quietly. Your identity was never revealed.
                      </span>
                      <button
                        type="button"
                        onClick={() => app.setInboxDecision("pending")}
                        className="underline ml-2 text-[#3A0C22]"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 4: PRICING & ONE-TIME PASSES                              */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "pricing" && (
          <div className="space-y-6">
            <div className={`text-center max-w-2xl mx-auto space-y-2 ${isMobile ? "-mt-3 relative z-20" : ""}`}>
              <span className="inline-block px-3.5 py-1 rounded-full bg-[#F7B93E] border-[1.75px] border-[#3A0C22] text-xs font-extrabold shadow-[0_2px_0_#3A0C22]">
                Zero Subscriptions · Pay Once
              </span>
              <h1 className="font-pom-display font-bold text-3xl sm:text-4xl">
                Simple Time-Based Passes
              </h1>
              <p className="text-xs sm:text-sm text-[#7D4D61] font-medium">
                Start with 2 free ATS audits + free anonymous Talent Pool. Upgrade only when you&apos;re ready to export.
              </p>
            </div>

            <div
              className={`grid gap-5 ${
                isMobile ? "grid-cols-1" : "grid-cols-3 items-stretch"
              }`}
            >
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  className={`rounded-[28px] border-[2px] border-[#3A0C22] overflow-hidden flex flex-col justify-between ${
                    tier.popular
                      ? "bg-white shadow-[0_6px_0_#EA375D]"
                      : "bg-white shadow-[0_4px_0_#3A0C22]"
                  }`}
                >
                  <div>
                    <div
                      className={`px-5 py-3.5 border-b border-[#3A0C22]/15 flex items-center justify-between ${
                        tier.popular ? "bg-[#EA375D] text-white" : "bg-[#F6F1E4]"
                      }`}
                    >
                      <span className="font-pom-display font-bold text-lg">
                        {tier.label}
                      </span>
                      {tier.popular ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F7B93E] text-[#3A0C22] border border-[#3A0C22] text-[10px] font-extrabold">
                          MOST CHOSEN
                        </span>
                      ) : (
                        <span className="text-xs font-bold opacity-80">
                          {tier.duration}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold">
                          ${tier.price}
                        </span>
                        <span className="text-xs font-bold text-[#7D4D61]">
                          one-time · {tier.duration}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#7D4D61]">
                        {tier.tagline}
                      </p>
                      <ul className="space-y-2.5">
                        {tier.highlights.map((h) => (
                          <li
                            key={h}
                            className="flex items-start gap-2.5 text-xs font-semibold"
                          >
                            <span className="w-5 h-5 rounded-full bg-[#74D4A0] border border-[#3A0C22] flex items-center justify-center shrink-0 mt-0.5">
                              <ProtoIcon name="check" size={11} color="#3A0C22" strokeWidth={2.8} />
                            </span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      type="button"
                      onClick={() => app.activateDemoPass(tier.label)}
                      className={`w-full py-3 rounded-full border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] active:translate-y-0.5 text-xs font-extrabold transition-transform ${
                        tier.popular
                          ? "bg-[#EA375D] text-white"
                          : "bg-[#F6F1E4] text-[#3A0C22] hover:bg-[#F7B93E]"
                      }`}
                    >
                      Get {tier.label} — ${tier.price} →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Clean FAQ Accordion */}
            <div className="max-w-3xl mx-auto bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
              <div className="bg-[#F6F1E4] px-5 py-3 text-xs font-extrabold border-b border-[#3A0C22]/15">
                Quick Answers
              </div>
              <div className="divide-y divide-[#3A0C22]/10">
                {PRICING_FAQS.map((faq, idx) => {
                  const open = app.openFaqIdx === idx;
                  return (
                    <div key={faq.q}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => app.setOpenFaqIdx(open ? null : idx)}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-left gap-3 hover:bg-[#FFFDF5]"
                      >
                        <span className="text-sm font-bold">{faq.q}</span>
                        <ProtoIcon
                          name="chevron"
                          size={16}
                          color="#3A0C22"
                          className={`shrink-0 transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {open && (
                        <div className="px-5 pb-4 text-xs text-[#7D4D61] leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 5: PROFILE & SAVED HISTORY                                */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "profile" && (
          <div className="space-y-6">
            <div className={isMobile ? "-mt-5 relative z-20" : ""}>
              <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] p-5 shadow-[0_4px_0_#3A0C22] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-[#EA375D] border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] flex items-center justify-center">
                    <BrandTailorBot theme="pomegranate" state="celebrating" size={42} />
                  </div>
                  <div>
                    <h1 className="font-pom-display font-bold text-2xl">
                      {persona.privateName}
                    </h1>
                    <p className="text-xs font-semibold text-[#7D4D61]">
                      {persona.privateEmail} · {app.activePassLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#FFF3D6] border-[1.5px] border-[#3A0C22] text-xs font-extrabold">
                    ★ 4-Day Streak
                  </span>
                  <button
                    type="button"
                    onClick={() => app.setActivePage("agents")}
                    className="px-3.5 py-1.5 rounded-full bg-[#F6F1E4] border-[1.5px] border-[#3A0C22] text-xs font-extrabold"
                  >
                    Recruiter API →
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] overflow-hidden shadow-[0_4px_0_#3A0C22]">
              <div className="bg-[#F6F1E4] px-5 py-3 border-b border-[#3A0C22]/15 flex items-center justify-between">
                <span className="text-xs font-extrabold">
                  Saved Tailored Resumes
                </span>
                <button
                  type="button"
                  onClick={() => {
                    app.setTailorView("input");
                    app.setActivePage("tailor");
                  }}
                  className="text-xs font-extrabold text-[#EA375D]"
                >
                  + New Tailor
                </button>
              </div>
              <div className="divide-y divide-[#3A0C22]/10">
                {persona.savedResumes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      app.setTailorView("results");
                      app.setActivePage("tailor");
                    }}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-[#FFFDF5] text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CoinIcon icon="document" bg="#7BC6FA" size={36} />
                      <div>
                        <div className="text-sm font-extrabold">
                          {item.roleTitle}
                        </div>
                        <div className="text-xs text-[#7D4D61] font-medium">
                          {item.company} · {item.updatedAt} · {item.aiToolsCount} AI tools
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-[#E6F7EF] text-[#125D44] text-xs font-extrabold">
                        {item.beforeScore}% → {item.afterScore}%
                      </span>
                      <span className="w-7 h-7 rounded-full border border-[#3A0C22]/25 flex items-center justify-center">
                        <ProtoIcon name="arrow" size={13} color="#3A0C22" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 6: RECRUITING AGENTS & API HUB                            */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "agents" && (
          <div className="space-y-6">
            <div className={isMobile ? "-mt-5 relative z-20" : ""}>
              <div className="bg-white border-[2px] border-[#3A0C22] rounded-[26px] p-5 shadow-[0_4px_0_#3A0C22] space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-[#F6F1E4] border border-[#3A0C22]/25 text-[11px] font-extrabold">
                  Agent-Native Discovery · A2A + OpenAPI 3.1
                </span>
                <h1 className="font-pom-display font-bold text-2xl sm:text-3xl">
                  For AI Recruiting Agents
                </h1>
                <p className="text-xs sm:text-sm text-[#7D4D61]">
                  Query verified, AI-fluent anonymous candidates programmatically with built-in double opt-in.
                </p>
              </div>
            </div>

            <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
              {[
                { path: "/.well-known/agent.json", label: "A2A Agent Card", bg: "#F7B93E" },
                { path: "/openapi.json", label: "OpenAPI 3.1 Spec", bg: "#7BC6FA" },
                { path: "/llms-full.txt", label: "LLM Context Index", bg: "#74D4A0" },
              ].map((ep) => (
                <div
                  key={ep.path}
                  className="bg-white border-[2px] border-[#3A0C22] rounded-[22px] p-4 shadow-[0_3px_0_#3A0C22] flex items-center gap-3"
                >
                  <CoinIcon icon="code" bg={ep.bg} size={36} />
                  <div>
                    <div className="text-xs font-extrabold">{ep.label}</div>
                    <div className="text-[11px] font-mono text-[#7D4D61]">
                      {ep.path}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <pre className="bg-[#2A0A19] text-[#FFFDF5] border-[2px] border-[#3A0C22] rounded-[24px] p-5 text-xs font-mono overflow-x-auto leading-relaxed shadow-[0_4px_0_#3A0C22]">
{`GET /api/talent/search?industry=healthcare&ai_tool=nuance-dax&region=us-west
→ 200 OK (Zero PII · Double Opt-In Enforced)

${publicJsonPreview}`}
            </pre>
          </div>
        )}
      </main>

      {/* ================================================================ */}
      {/* DESKTOP FOOTER                                                   */}
      {/* ================================================================ */}
      {!isMobile && (
        <footer className="border-t-[2px] border-[#3A0C22]/15 bg-[#F6F1E4]/70 mt-10">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-[#7D4D61]">
            <div className="flex items-center gap-2.5">
              <BrandTailorBot theme="pomegranate" state="idle" size={28} />
              <span className="font-pom-display text-base text-[#3A0C22]">
                resume tailor
              </span>
              <span>· Built for calm, high-match applications</span>
            </div>
            <div className="flex items-center gap-5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => app.setActivePage(item.id)}
                  className="hover:text-[#3A0C22]"
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => app.setActivePage("agents")}
                className="hover:text-[#3A0C22]"
              >
                Agents API
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* ================================================================ */}
      {/* MOBILE FLOATING PILL BOTTOM NAV (Faithful to Pomegranate Image!) */}
      {/* ================================================================ */}
      {isMobile && (
        <nav
          aria-label="Mobile bottom navigation"
          className="sticky bottom-3 z-30 px-3 mt-auto"
        >
          <div className="bg-white border-[2px] border-[#3A0C22] rounded-full px-2 py-1.5 flex items-center justify-around shadow-[0_6px_18px_rgba(58,12,34,0.14)] relative">
            {NAV_ITEMS.map((item) => {
              const active = app.activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => app.setActivePage(item.id)}
                  className={`relative flex-1 py-1.5 rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? "bg-[#F6F1E4] text-[#3A0C22]" : "text-[#7D4D61]"
                  }`}
                >
                  <ProtoIcon
                    name={item.icon}
                    size={18}
                    color={active ? "#EA375D" : "#3A0C22"}
                    strokeWidth={2.2}
                  />
                  <span className="text-[9px] font-extrabold tracking-wide">
                    {item.short}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA375D] border-[1.75px] border-[#3A0C22]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* ================================================================ */}
      {/* MODAL: EXPORT PDF TEMPLATE PICKER                                */}
      {/* ================================================================ */}
      {app.exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export tailored resume"
          className="fixed inset-0 z-[80] bg-[#3A0C22]/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFDF5] border-[2px] border-[#3A0C22] rounded-[28px] max-w-md w-full overflow-hidden shadow-[0_6px_0_#3A0C22]">
            <div className="bg-[#EA375D] text-white px-5 py-4 flex items-center justify-between border-b-[2px] border-[#3A0C22]">
              <span className="font-pom-display font-bold text-lg">
                Export ATS-Ready Resume
              </span>
              <button
                type="button"
                aria-label="Close export modal"
                onClick={() => app.setExportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-[#3A0C22] border-[1.5px] border-[#3A0C22] flex items-center justify-center"
              >
                <ProtoIcon name="close" size={14} color="#3A0C22" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: "executive", label: "Executive" },
                    { id: "clinical", label: "Clinical" },
                    { id: "minimal", label: "Minimal" },
                  ] as const
                ).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => app.setPdfTemplate(tpl.id)}
                    className={`p-3 rounded-2xl border-[1.75px] text-xs font-extrabold transition-all ${
                      app.pdfTemplate === tpl.id
                        ? "bg-[#F7B93E] border-[#3A0C22] shadow-[0_3px_0_#3A0C22]"
                        : "bg-white border-[#3A0C22]/20"
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl bg-white border border-[#3A0C22]/20 p-3.5 text-xs text-[#7D4D61]">
                1 Page · {app.liveScore}% ATS Match · {app.approvedCount} upgraded bullets · {app.selectedToolCount} AI workflows
              </div>
              <button
                type="button"
                onClick={() => {
                  app.setExportModalOpen(false);
                  app.triggerToast(`Downloaded ${app.pdfTemplate} PDF!`);
                }}
                className="w-full py-3.5 rounded-full bg-[#EA375D] text-white border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] text-sm font-extrabold"
              >
                Download PDF →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: RECRUITER INTRO REQUEST (WITH 3 LIVE GUARDRAILS)          */}
      {/* ================================================================ */}
      {app.introModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Request interview introduction"
          className="fixed inset-0 z-[80] bg-[#3A0C22]/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFDF5] border-[2px] border-[#3A0C22] rounded-[28px] max-w-md w-full overflow-hidden shadow-[0_6px_0_#3A0C22]">
            <div className="bg-[#F6F1E4] px-5 py-4 flex items-center justify-between border-b-[2px] border-[#3A0C22]">
              <span className="font-pom-display font-bold text-lg">
                Request Intro · {persona.publicId}
              </span>
              <button
                type="button"
                aria-label="Close intro modal"
                onClick={() => app.setIntroModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#3A0C22] flex items-center justify-center"
              >
                <ProtoIcon name="close" size={14} color="#3A0C22" />
              </button>
            </div>
            <form onSubmit={app.submitIntroRequest} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="pom-recruiter-email"
                  className="text-xs font-extrabold"
                >
                  Work Email (Test guardrails live!)
                </label>
                <input
                  id="pom-recruiter-email"
                  type="email"
                  required
                  value={app.recruiterEmailInput}
                  onChange={(e) => app.setRecruiterEmailInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border-[1.75px] border-[#3A0C22] text-sm font-semibold"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "gmail (blocked)", email: "test@gmail.com" },
                    {
                      label: "employer (stealth)",
                      email: `hr@${app.blockedDomain || persona.blockedDomainDefault}`,
                    },
                    { label: "valid work", email: persona.sampleIntro.recruiterEmail },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => app.setRecruiterEmailInput(q.email)}
                      className="px-2.5 py-1 rounded-full bg-[#F6F1E4] border border-[#3A0C22]/20 text-[10px] font-bold hover:border-[#3A0C22]"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {app.introSubmitState === "blocked_free" && (
                <div className="rounded-2xl bg-[#FDE7EE] border border-[#EA375D] p-3 text-xs font-bold text-[#C41E46]">
                  Blocked: Please use a verified company work email (no Gmail/Yahoo).
                </div>
              )}
              {app.introSubmitState === "blocked_employer" && (
                <div className="rounded-2xl bg-[#F6F1E4] border border-[#3A0C22]/30 p-3 text-xs font-bold text-[#7D4D61]">
                  Stealth Guard: Request silently dropped because domain matches candidate&apos;s blocked employer.
                </div>
              )}
              {app.introSubmitState === "sent" && (
                <div className="rounded-2xl bg-[#E6F7EF] border border-[#128C66] p-3 text-xs font-bold text-[#125D44]">
                  ✓ Verified! Candidate received a double-opt-in intro card.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#EA375D] text-white border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] text-xs font-extrabold"
              >
                Send Verified Intro Request →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING TOAST */}
      {app.toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-full bg-[#3A0C22] text-[#FFFDF5] border-[2px] border-[#F7B93E] shadow-lg text-xs font-extrabold whitespace-nowrap"
        >
          ✦ {app.toastMessage}
        </div>
      )}
    </div>
  );
}
