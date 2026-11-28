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

const NAV_ITEMS: Array<{ id: SitePage; label: string; index: string; icon: IconName }> = [
  { id: "tailor", label: "Tailor", index: "01", icon: "sparkle" },
  { id: "futureproof", label: "Add AI", index: "02", icon: "ai" },
  { id: "talent", label: "Talent", index: "03", icon: "talent" },
  { id: "pricing", label: "Passes", index: "04", icon: "pricing" },
  { id: "profile", label: "Archive", index: "05", icon: "profile" },
];

export default function RisographSite({
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
      label: "Keywords",
      valueLabel: `${persona.keywordsMatched.length + persona.keywordsAdded.length}/${
        persona.keywordsMatched.length + persona.keywordsAdded.length + 1
      }`,
      pct: 0.93,
      color: "#D65A38",
      complete: true,
    },
    {
      id: "bullets",
      label: "Bullets",
      valueLabel: `${app.approvedCount}/${persona.bullets.length}`,
      pct: Math.max(0.25, app.approvedCount / persona.bullets.length),
      color: "#2B6B5A",
      complete: app.approvedCount === persona.bullets.length,
    },
    {
      id: "ai",
      label: "AI Tools",
      valueLabel: `${app.selectedToolCount} verified`,
      pct: Math.min(0.95, 0.35 + app.selectedToolCount * 0.2),
      color: "#D69B24",
      complete: app.selectedToolCount >= 2,
    },
    {
      id: "fit",
      label: "1-Page Fit",
      valueLabel: "100%",
      pct: 0.92,
      color: "#4D7396",
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
      className={`min-h-full riso-paper-bg text-[#241F1A] font-riso-sans flex flex-col relative selection:bg-[#2B6B5A]/20 ${
        isMobile ? "pb-20" : ""
      }`}
    >
      {/* ================================================================ */}
      {/* HEADER: PRINT-ZINE MASTHEAD (MOBILE vs DESKTOP)                  */}
      {/* ================================================================ */}
      {isMobile ? (
        <header className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#241F1A]/10">
          <button
            type="button"
            onClick={() => app.setActivePage("tailor")}
            className="text-left"
          >
            <span className="font-riso-serif italic font-bold text-2xl text-[#2B6B5A] leading-none block">
              Tailor Studio
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#6C6358] mt-1 block">
              Edition · {persona.shortLabel}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => app.setExportModalOpen(true)}
              aria-label="Export PDF"
              className="px-3 py-1.5 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-[11px] font-semibold"
            >
              Export
            </button>
            <div className="w-10 h-10 rounded-full bg-[#FAEAE4] border border-[#D65A38]/25 flex items-center justify-center">
              <BrandTailorBot
                theme="risograph"
                state={app.botState}
                size={30}
                onPoke={app.pokeBot}
              />
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-30 bg-[#F6F0E4]/95 backdrop-blur-sm border-b border-[#241F1A]/10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
            {/* Editorial Brand Mark */}
            <button
              type="button"
              onClick={() => app.setActivePage("tailor")}
              className="flex items-center gap-3 group text-left"
            >
              <div className="w-11 h-11 rounded-full bg-[#FAEAE4] border border-[#D65A38]/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BrandTailorBot theme="risograph" state={app.botState} size={34} />
              </div>
              <div>
                <span className="font-riso-serif italic font-bold text-2xl text-[#2B6B5A] leading-none block">
                  Tailor Studio
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#6C6358] mt-0.5 block">
                  AI Resume &amp; Career Craft
                </span>
              </div>
            </button>

            {/* Horizontal Editorial Navigation (Semantic <nav> + aria-current) */}
            <nav
              aria-label="Risograph primary navigation"
              className="flex items-center gap-1"
            >
              {NAV_ITEMS.map((item) => {
                const active = app.activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => app.setActivePage(item.id)}
                    className={`relative px-3.5 py-2 text-xs font-semibold transition-colors rounded-full ${
                      active
                        ? "text-[#241F1A] bg-[#FFFDF8] border border-[#241F1A]/12"
                        : "text-[#6C6358] hover:text-[#241F1A]"
                    }`}
                  >
                    <span className="font-riso-serif italic text-[#D65A38] mr-1.5">
                      {item.index}
                    </span>
                    <span>{item.label}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0.5 left-4 right-4 h-[2px] bg-[#2B6B5A] rounded-full"
                      />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                aria-current={app.activePage === "agents" ? "page" : undefined}
                onClick={() => app.setActivePage("agents")}
                className={`relative px-3.5 py-2 text-xs font-semibold transition-colors rounded-full ${
                  app.activePage === "agents"
                    ? "text-[#241F1A] bg-[#FFFDF8] border border-[#241F1A]/12"
                    : "text-[#6C6358] hover:text-[#241F1A]"
                }`}
              >
                <span className="font-riso-serif italic text-[#D65A38] mr-1.5">
                  06
                </span>
                <span>API</span>
              </button>
            </nav>

            {/* Right Editorial Stamp & Export CTA */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={app.togglePassTier}
                className="px-3.5 py-2 rounded-full bg-[#E5EFEA] border border-[#2B6B5A]/25 text-[#2B6B5A] text-xs font-semibold hover:bg-[#d8e8e0] transition-colors"
              >
                {app.hasPass ? `✦ ${app.activePassLabel}` : "Free Edition"}
              </button>
              <button
                type="button"
                onClick={() => app.setExportModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-xs font-semibold shadow-[3px_3px_0_rgba(214,90,56,0.28)] hover:bg-[#23594a] transition-colors flex items-center gap-1.5"
              >
                <ProtoIcon name="download" size={13} color="#FFFDF8" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ================================================================ */}
      {/* MAIN CONTENT                                                     */}
      {/* ================================================================ */}
      <main
        className={`flex-1 w-full mx-auto ${
          isMobile ? "px-4 py-5" : "max-w-6xl px-6 py-8"
        }`}
      >
        {/* -------------------------------------------------------------- */}
        {/* PAGE 1: TAILOR STUDIO                                          */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "tailor" && (
          <div className="space-y-6">
            {/* Editorial Page Header + Mode Switcher */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#241F1A]/10 pb-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#D65A38] font-semibold">
                  Chapter 01 · Resume Tailoring
                </p>
                <h1
                  className={`font-riso-serif font-bold tracking-tight mt-1 ${
                    isMobile ? "text-2xl leading-tight" : "text-4xl leading-tight"
                  }`}
                >
                  {app.tailorView === "results" ? (
                    <>
                      Your resume grew from{" "}
                      <span className="text-[#8C7B6B]">{persona.baseScore}%</span>{" "}
                      to <span className="text-[#2B6B5A] italic">{app.liveScore}%</span>
                    </>
                  ) : (
                    <>
                      Tailor with{" "}
                      <span className="italic text-[#2B6B5A]">quiet precision</span>
                    </>
                  )}
                </h1>
              </div>

              <div
                role="tablist"
                aria-label="Tailor studio view"
                className="inline-flex bg-[#FFFDF8] border border-[#241F1A]/15 rounded-full p-1"
              >
                {(
                  [
                    { id: "results", label: "Match Review" },
                    { id: "input", label: "Start Fresh" },
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
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selected
                          ? "bg-[#2B6B5A] text-[#FFFDF8]"
                          : "text-[#6C6358] hover:text-[#241F1A]"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {app.tailorView === "input" ? (
              <div
                className={`grid gap-6 ${
                  isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
                }`}
              >
                <div className={isMobile ? "space-y-4" : "col-span-7 space-y-4"}>
                  <div className="bg-[#FFFDF8] rounded-[28px] p-5 border border-[#241F1A]/12 shadow-[4px_4px_0_rgba(43,107,90,0.12)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-riso-serif italic font-bold text-base text-[#2B6B5A]">
                        01 · Your Resume
                      </span>
                      <span className="text-[11px] font-mono text-[#6C6358]">
                        PDF · DOCX · TXT
                      </span>
                    </div>
                    <div className="rounded-2xl bg-[#F6F0E4]/70 border border-dashed border-[#241F1A]/20 p-4 text-xs leading-relaxed text-[#241F1A]">
                      {persona.sampleResumeSnippet}
                    </div>
                  </div>

                  <div className="bg-[#FFFDF8] rounded-[28px] p-5 border border-[#241F1A]/12 shadow-[4px_4px_0_rgba(214,90,56,0.12)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-riso-serif italic font-bold text-base text-[#D65A38]">
                        02 · Target Role
                      </span>
                      <span className="text-[11px] font-mono text-[#6C6358]">
                        {persona.targetCompany}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-[#F6F0E4]/70 border border-[#241F1A]/12 p-4 text-xs leading-relaxed text-[#241F1A]">
                      {persona.sampleJobSnippet}
                    </div>
                  </div>
                </div>

                <div className={isMobile ? "space-y-4" : "col-span-5 space-y-4"}>
                  <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 shadow-[4px_4px_0_rgba(43,107,90,0.14)] space-y-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-full bg-[#FAEAE4] flex items-center justify-center shrink-0">
                        <BrandTailorBot
                          theme="risograph"
                          state={app.isTailoring ? "scanning" : "idle"}
                          size={42}
                          onPoke={app.pokeBot}
                        />
                      </div>
                      <div>
                        <p className="font-riso-serif font-bold text-lg">
                          Editorial Tone
                        </p>
                        <p className="text-xs text-[#6C6358]">
                          Human voice, strict 1-page proportions
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(
                        [
                          { id: "xyz", label: "01 · Google X-Y-Z Metrics", bg: "#E5EFEA" },
                          { id: "concise", label: "02 · Concise ≤2 Lines", bg: "#FAEAE4" },
                          { id: "ats", label: "03 · High ATS Keyword Parity", bg: "#FBF1DA" },
                        ] as const
                      ).map((p) => {
                        const active = app.tonePreset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => app.setTonePreset(p.id)}
                            className={`w-full px-4 py-3 rounded-2xl text-left text-xs font-semibold flex items-center justify-between transition-all border ${
                              active
                                ? "border-[#2B6B5A] shadow-[2px_2px_0_rgba(43,107,90,0.2)]"
                                : "border-transparent opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: p.bg }}
                          >
                            <span>{p.label}</span>
                            {active && (
                              <span className="text-[#2B6B5A] font-bold">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={app.runTailorDemo}
                      disabled={app.isTailoring}
                      className="w-full py-3.5 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-sm font-semibold tracking-wide shadow-[4px_4px_0_rgba(214,90,56,0.28)] hover:bg-[#23594a] transition-colors disabled:opacity-70"
                    >
                      {app.isTailoring
                        ? "Composing tailored draft..."
                        : "Tailor Resume →"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* RESULTS STUDIO: EDITORIAL FOLIO + INTERACTIVE REVISIONS */
              <div
                className={`grid gap-6 ${
                  isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
                }`}
              >
                {/* LEFT FOLIO: ARC GAUGE + NUMBERED PASTEL CHAPTER ROWS */}
                <div className={isMobile ? "space-y-4" : "col-span-5 space-y-4"}>
                  <div className="bg-[#FFFDF8] rounded-[28px] p-5 border border-[#241F1A]/10 shadow-[4px_4px_0_rgba(43,107,90,0.12)] space-y-4 text-center">
                    <div className="flex items-center justify-between text-left">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#6C6358]">
                          Target Fit
                        </span>
                        <p className="font-riso-serif font-bold text-lg leading-snug">
                          {persona.targetRole}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#E5EFEA] text-[#2B6B5A] text-xs font-bold">
                        +{app.liveScore - persona.baseScore} pts
                      </span>
                    </div>

                    <InteractiveArcGauge
                      theme="risograph"
                      metrics={arcMetrics}
                      selectedId={app.selectedArcId}
                      onSelect={app.setSelectedArcId}
                      compact={isMobile}
                    />
                  </div>

                  {/* Signature Warm Paper Pastel Editorial Rows */}
                  <div className="space-y-2.5">
                    {[
                      {
                        badge: "01",
                        title: `${app.approvedCount} Sharper Bullets`,
                        right: "Same length",
                        bg: "#E5EFEA",
                        ink: "#2B6B5A",
                        onClick: () => app.setSelectedArcId("bullets"),
                      },
                      {
                        badge: "02",
                        title: `${app.selectedToolCount} Real AI Tools`,
                        right: persona.roleBadge.split("·")[1]?.trim() || "Verified",
                        bg: "#FAEAE4",
                        ink: "#B94726",
                        onClick: () => app.setActivePage("futureproof"),
                      },
                      {
                        badge: "03",
                        title: "Interview Scripts",
                        right: "30s each",
                        bg: "#FBF1DA",
                        ink: "#9A6B10",
                        onClick: () => app.setActivePage("futureproof"),
                      },
                      {
                        badge: "04",
                        title: "AI Talent Pool",
                        right: app.discoveryOn ? "Live" : "Paused",
                        bg: "#E6EEF5",
                        ink: "#3B5F82",
                        onClick: () => app.setActivePage("talent"),
                      },
                    ].map((row) => (
                      <button
                        key={row.badge}
                        type="button"
                        onClick={row.onClick}
                        className="w-full rounded-2xl px-4 py-3.5 flex items-center justify-between transition-transform hover:translate-x-0.5 text-left border border-[#241F1A]/8"
                        style={{ backgroundColor: row.bg }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="font-riso-serif italic font-bold text-base"
                            style={{ color: row.ink }}
                          >
                            {row.badge}
                          </span>
                          <span className="text-sm font-semibold text-[#241F1A]">
                            {row.title}
                          </span>
                        </div>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: row.ink }}
                        >
                          {row.right} →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT STUDIO CANVAS: INTERACTIVE BULLET REVISIONS */}
                <div className={isMobile ? "space-y-4" : "col-span-7 space-y-4"}>
                  {/* Studio Companion Bar */}
                  <div className="bg-[#FFFDF8] rounded-[24px] px-5 py-3.5 border border-[#241F1A]/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <BrandTailorBot
                        theme="risograph"
                        state={app.botState}
                        size={38}
                        onPoke={app.pokeBot}
                      />
                      <div>
                        <p className="font-riso-serif italic text-sm font-bold text-[#2B6B5A]">
                          &ldquo;{app.getBotQuip("risograph")}&rdquo;
                        </p>
                        <p className="text-[11px] text-[#6C6358]">
                          Tap any revision to include or keep your original line.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => app.setExportModalOpen(true)}
                      className="shrink-0 px-4 py-2 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-xs font-semibold"
                    >
                      See PDF →
                    </button>
                  </div>

                  {/* Bullet Revisions */}
                  <div className="space-y-3">
                    {persona.bullets.map((b, idx) => {
                      const approved = Boolean(app.approvedBullets[b.id]);
                      const whyOpen = app.expandedWhyId === b.id;
                      return (
                        <article
                          key={b.id}
                          className={`rounded-[24px] p-5 border transition-all ${
                            approved
                              ? "bg-[#FFFDF8] border-[#241F1A]/12 shadow-[4px_4px_0_rgba(43,107,90,0.1)]"
                              : "bg-[#F6F0E4]/60 border-[#241F1A]/8 opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#241F1A]/8">
                            <div className="flex items-center gap-2.5">
                              <span className="font-riso-serif italic font-bold text-sm text-[#D65A38]">
                                0{idx + 1}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wider text-[#241F1A]">
                                {b.section}
                              </span>
                              <span className="text-[11px] text-[#6C6358]">
                                · {b.lineBadge}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#2B6B5A]">
                                +{b.scoreGain}%
                              </span>
                              <button
                                type="button"
                                onClick={() => app.toggleBullet(b.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                  approved
                                    ? "bg-[#E5EFEA] text-[#2B6B5A] border border-[#2B6B5A]/30"
                                    : "bg-white text-[#6C6358] border border-[#241F1A]/15"
                                }`}
                              >
                                {approved ? "✓ Kept" : "Use Edit"}
                              </button>
                            </div>
                          </div>

                          <div className="pt-3 space-y-2">
                            <p className="text-xs text-[#8C7B6B] line-through decoration-[#D65A38]/50">
                              {b.before}
                            </p>
                            <p className="text-sm font-medium text-[#241F1A] leading-relaxed">
                              {b.after}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {b.addedKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="px-2.5 py-0.5 rounded-full bg-[#FBF1DA] text-[#7D570B] text-[11px] font-semibold"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                              <button
                                type="button"
                                aria-expanded={whyOpen}
                                onClick={() =>
                                  app.setExpandedWhyId(whyOpen ? null : b.id)
                                }
                                className="text-xs font-semibold text-[#D65A38] hover:underline"
                              >
                                {whyOpen ? "Hide note" : "Editor's note"}
                              </button>
                            </div>

                            {whyOpen && (
                              <div className="mt-2 rounded-2xl bg-[#F6F0E4] px-4 py-3 text-xs text-[#4A4239] leading-relaxed">
                                {b.why}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 2: FUTUREPROOF (AI EXPERIENCE WORKSHOP)                   */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "futureproof" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 shadow-[4px_4px_0_rgba(214,90,56,0.12)] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <span className="inline-block px-3 py-1 rounded-full bg-[#E5EFEA] text-[#2B6B5A] text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Timeline Protected · 2023–Present Only
                </span>
                <h1 className="font-riso-serif font-bold text-2xl sm:text-4xl">
                  Weave real <span className="italic text-[#D65A38]">AI tools</span> into your story
                </h1>
                <p className="text-xs sm:text-sm text-[#6C6358]">
                  Industry-standard workflows matched to your profession, complete with calm 30-second spoken scripts.
                </p>
              </div>
              <div className="rounded-2xl bg-[#FAEAE4] px-5 py-3.5 text-center border border-[#D65A38]/20">
                <div className="font-riso-serif text-3xl font-bold text-[#B94726] leading-none">
                  0{app.selectedToolCount}
                </div>
                <div className="text-[11px] font-semibold text-[#6C6358] mt-1">
                  Tools Selected
                </div>
              </div>
            </div>

            {/* Horizontal Role Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ROLE_CHIPS.map((chip) => {
                const active = app.selectedRoleChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => app.setSelectedRoleChip(chip.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${
                      active
                        ? "bg-[#2B6B5A] text-[#FFFDF8] border-[#2B6B5A]"
                        : "bg-[#FFFDF8] text-[#6C6358] border-[#241F1A]/12 hover:text-[#241F1A]"
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
              {/* Tool Selection Folio */}
              <div className={isMobile ? "space-y-3" : "col-span-6 space-y-3"}>
                {persona.futureproofTools.map((tool, idx) => {
                  const selected = Boolean(app.selectedToolIds[tool.id]);
                  const tints = ["#E5EFEA", "#FAEAE4", "#FBF1DA", "#E6EEF5"];
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => app.toggleTool(tool.id)}
                      className={`w-full text-left rounded-[24px] p-4 border transition-all flex items-start justify-between gap-3 ${
                        selected
                          ? "bg-[#FFFDF8] border-[#2B6B5A]/40 shadow-[4px_4px_0_rgba(43,107,90,0.12)]"
                          : "bg-[#FFFDF8]/60 border-[#241F1A]/10 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-riso-serif italic font-bold text-sm shrink-0"
                          style={{ backgroundColor: tints[idx % tints.length] }}
                        >
                          0{idx + 1}
                        </span>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm">{tool.name}</span>
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F6F0E4] text-[#6C6358]">
                              {tool.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[#6C6358] leading-snug">
                            {tool.oneLiner}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                          selected
                            ? "bg-[#2B6B5A] border-[#2B6B5A]"
                            : "bg-transparent border-[#241F1A]/25"
                        }`}
                      >
                        {selected && (
                          <ProtoIcon name="check" size={12} color="#FFFDF8" strokeWidth={2.8} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Generated Bullets & 30s Spoken Scripts */}
              <div className={isMobile ? "space-y-4" : "col-span-6 space-y-4"}>
                <div className="bg-[#FFFDF8] rounded-[28px] p-5 border border-[#241F1A]/12 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-riso-serif italic font-bold text-lg text-[#2B6B5A]">
                      Generated Resume Lines
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        app.triggerToast("AI lines added to your draft");
                        app.setActivePage("tailor");
                      }}
                      className="text-xs font-semibold text-[#D65A38] hover:underline"
                    >
                      Sync to Tailor →
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {persona.futureproofTools
                      .filter((t) => app.selectedToolIds[t.id])
                      .map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl bg-[#F6F0E4]/80 p-3.5 text-xs leading-relaxed"
                        >
                          <div className="text-[10px] font-mono uppercase tracking-wider text-[#2B6B5A] font-semibold mb-1">
                            {t.name} · {t.category}
                          </div>
                          <p className="font-medium text-[#241F1A]">
                            {t.generatedBullet}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 30s Interview Scripts */}
                <div className="bg-[#FFFDF8] rounded-[28px] p-5 border border-[#241F1A]/12 space-y-4">
                  <h2 className="font-riso-serif italic font-bold text-lg text-[#D65A38]">
                    30-Second Spoken Scripts
                  </h2>
                  {persona.futureproofTools
                    .filter((t) => app.selectedToolIds[t.id])
                    .slice(0, 2)
                    .map((t) => {
                      const running = app.activeTimerToolId === t.id;
                      return (
                        <div
                          key={t.id}
                          className="rounded-2xl bg-[#FBF1DA]/65 p-4 space-y-2 border border-[#D69B24]/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-[#241F1A]">
                              &ldquo;{t.scriptQuestion}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                running
                                  ? app.stopScriptTimer()
                                  : app.startScriptTimer(t.id)
                              }
                              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                                running
                                  ? "bg-[#D65A38] text-[#FFFDF8]"
                                  : "bg-[#FFFDF8] text-[#241F1A] border border-[#241F1A]/15"
                              }`}
                            >
                              <ProtoIcon
                                name="timer"
                                size={12}
                                color={running ? "#FFFDF8" : "#241F1A"}
                              />
                              <span>
                                {running ? `${app.timerSeconds}s` : "Practice 30s"}
                              </span>
                            </button>
                          </div>
                          <p className="text-xs text-[#4A4239] leading-relaxed italic font-riso-serif">
                            &ldquo;{t.script30s}&rdquo;
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 3: AGENT TALENT NETWORK                                   */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "talent" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#2B6B5A] font-semibold">
                  Anonymous · Double Opt-In Only
                </p>
                <h1 className="font-riso-serif font-bold text-2xl sm:text-4xl">
                  Let hiring agents <span className="italic text-[#D65A38]">come to you</span>
                </h1>
                <p className="text-xs sm:text-sm text-[#6C6358]">
                  Free anonymous Talent Pool for everyone. Shareable LinkedIn Agent Dossier with any Pass.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Talent network sections"
                className="flex gap-1 bg-[#F6F0E4] p-1 rounded-full border border-[#241F1A]/12 overflow-x-auto"
              >
                {(
                  [
                    { id: "controls", label: "01 Controls" },
                    { id: "card", label: "02 LinkedIn Card" },
                    { id: "inbox", label: "03 Inbox (1)" },
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
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selected
                          ? "bg-[#2B6B5A] text-[#FFFDF8]"
                          : "text-[#6C6358] hover:text-[#241F1A]"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {app.talentTab === "controls" && (
              <div
                className={`grid gap-6 ${
                  isMobile ? "grid-cols-1" : "grid-cols-12 items-start"
                }`}
              >
                <div className={isMobile ? "space-y-4" : "col-span-7 space-y-4"}>
                  <div className="bg-[#FFFDF8] rounded-[28px] border border-[#241F1A]/12 divide-y divide-[#241F1A]/10 overflow-hidden">
                    <div className="p-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold">
                          AI Recruiting Discovery
                        </div>
                        <div className="text-xs text-[#6C6358] mt-0.5">
                          {app.discoveryOn
                            ? "Anonymous card visible to verified sourcing agents"
                            : "Paused — hidden everywhere"}
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={app.discoveryOn}
                        onClick={() => app.setDiscoveryOn(!app.discoveryOn)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          app.discoveryOn
                            ? "bg-[#2B6B5A] text-[#FFFDF8]"
                            : "bg-[#EFE8DA] text-[#6C6358]"
                        }`}
                      >
                        {app.discoveryOn ? "Active" : "Paused"}
                      </button>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="riso-blocked-domain"
                          className="text-sm font-bold"
                        >
                          Stealth Blocklist (Current Employer)
                        </label>
                        <span className="text-[11px] font-mono text-[#2B6B5A]">
                          SILENT DROP
                        </span>
                      </div>
                      <input
                        id="riso-blocked-domain"
                        type="text"
                        value={app.blockedDomain}
                        onChange={(e) => app.setBlockedDomain(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F0E4]/80 border border-[#241F1A]/15 focus:border-[#2B6B5A] focus:outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold">
                          Display Salary Floor ({persona.compFloor})
                        </div>
                        <div className="text-xs text-[#6C6358] mt-0.5">
                          Pre-filters compensation before an intro reaches you
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={app.showSalaryFloor}
                        onClick={() =>
                          app.setShowSalaryFloor(!app.showSalaryFloor)
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                          app.showSalaryFloor
                            ? "bg-[#FBF1DA] text-[#8E620C] border border-[#D69B24]/30"
                            : "bg-[#F6F0E4] text-[#6C6358]"
                        }`}
                      >
                        {app.showSalaryFloor ? "Shown" : "Hidden"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={isMobile ? "space-y-4" : "col-span-5 space-y-4"}>
                  <div className="bg-[#FFFDF8] rounded-[28px] p-5 border border-[#241F1A]/12 shadow-[4px_4px_0_rgba(43,107,90,0.12)] space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#E5EFEA] p-4 text-center">
                        <div className="font-riso-serif text-3xl font-bold text-[#2B6B5A]">
                          {persona.agentSearchesWeek}
                        </div>
                        <div className="text-[11px] font-semibold text-[#4A5E57] mt-1">
                          Agent Matches / wk
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#FAEAE4] p-4 text-center">
                        <div className="font-riso-serif text-3xl font-bold text-[#D65A38]">
                          {persona.cardViewsWeek}
                        </div>
                        <div className="text-[11px] font-semibold text-[#7A4A3B] mt-1">
                          Card Views / wk
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#F6F0E4] p-4 space-y-2.5 border border-[#241F1A]/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          LinkedIn Agent Dossier
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#D65A38] font-bold">
                          {app.hasPass ? "Unlocked" : "Pass Only"}
                        </span>
                      </div>
                      {app.hasPass ? (
                        <>
                          <div className="px-3 py-2 rounded-xl bg-[#FFFDF8] text-xs font-mono text-[#241F1A] truncate border border-[#241F1A]/10">
                            airesumetailor.com/t/{persona.publicId}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                app.triggerToast("LinkedIn Dossier link copied!")
                              }
                              className="flex-1 py-2 rounded-full bg-[#241F1A] text-[#FFFDF8] text-xs font-semibold"
                            >
                              Copy Link
                            </button>
                            <button
                              type="button"
                              onClick={() => app.setTalentTab("card")}
                              className="flex-1 py-2 rounded-full bg-[#FFFDF8] border border-[#241F1A]/20 text-xs font-semibold"
                            >
                              Preview →
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => app.setActivePage("pricing")}
                          className="w-full py-2.5 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-xs font-semibold"
                        >
                          Unlock with $9 Pass →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {app.talentTab === "card" && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#6C6358]">
                    airesumetailor.com/t/{persona.publicId}
                  </span>
                  <div className="inline-flex bg-[#FFFDF8] border border-[#241F1A]/15 rounded-full p-1">
                    <button
                      type="button"
                      onClick={() => app.setCardViewMode("human")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        app.cardViewMode === "human"
                          ? "bg-[#241F1A] text-[#FFFDF8]"
                          : "text-[#6C6358]"
                      }`}
                    >
                      Human View
                    </button>
                    <button
                      type="button"
                      onClick={() => app.setCardViewMode("json")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        app.cardViewMode === "json"
                          ? "bg-[#241F1A] text-[#FFFDF8]"
                          : "text-[#6C6358]"
                      }`}
                    >
                      Agent JSON
                    </button>
                  </div>
                </div>

                {app.cardViewMode === "human" ? (
                  <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 shadow-[5px_5px_0_rgba(43,107,90,0.14)] space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#241F1A]/10 pb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#2B6B5A] font-bold">
                          Verified AI-Fluent Dossier · {persona.publicId}
                        </span>
                        <h2 className="font-riso-serif font-bold text-2xl mt-1">
                          {persona.headline}
                        </h2>
                        <p className="text-xs text-[#6C6358] mt-1">
                          {persona.yearsExperience}+ years · {persona.workMode} ·{" "}
                          {persona.region}
                          {app.showSalaryFloor ? ` · ${persona.compFloor}` : ""}
                        </p>
                      </div>
                      <BrandTailorBot theme="risograph" state="celebrating" size={44} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {persona.futureproofTools
                        .filter((t) => app.selectedToolIds[t.id])
                        .map((t) => (
                          <span
                            key={t.id}
                            className="px-3 py-1 rounded-full bg-[#E5EFEA] text-[#2B6B5A] text-xs font-semibold"
                          >
                            ✦ {t.name}
                          </span>
                        ))}
                    </div>

                    <div className="space-y-2.5">
                      {persona.anonymizedHighlights.map((h, i) => (
                        <div
                          key={i}
                          className="rounded-2xl bg-[#F6F0E4]/75 px-4 py-3 text-xs leading-relaxed text-[#241F1A] flex gap-3"
                        >
                          <span className="font-riso-serif italic font-bold text-[#D65A38]">
                            0{i + 1}
                          </span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => app.setIntroModalOpen(true)}
                      className="w-full py-3.5 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-sm font-semibold shadow-[4px_4px_0_rgba(214,90,56,0.24)]"
                    >
                      Request Verified Introduction →
                    </button>
                  </div>
                ) : (
                  <pre className="bg-[#241F1A] text-[#F6F0E4] rounded-[24px] p-5 text-xs font-mono overflow-x-auto leading-relaxed">
                    {publicJsonPreview}
                  </pre>
                )}
              </div>
            )}

            {app.talentTab === "inbox" && (
              <div className="max-w-2xl mx-auto bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 shadow-[5px_5px_0_rgba(214,90,56,0.14)] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#241F1A]/10 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#2B6B5A] font-bold">
                      Verified Company Domain · Double Opt-In
                    </span>
                    <h2 className="font-riso-serif font-bold text-2xl mt-1">
                      {persona.sampleIntro.company}
                    </h2>
                    <p className="text-xs text-[#6C6358]">
                      {persona.sampleIntro.roleTitle} · {persona.sampleIntro.workMode}
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-[#E5EFEA] text-[#2B6B5A] text-xs font-bold">
                    {persona.sampleIntro.compRange}
                  </span>
                </div>

                <blockquote className="rounded-2xl bg-[#F6F0E4]/80 p-4 text-xs leading-relaxed text-[#241F1A] border-l-2 border-[#D65A38]">
                  &ldquo;{persona.sampleIntro.pitch}&rdquo;
                  <footer className="mt-2 text-[#6C6358] font-semibold">
                    — {persona.sampleIntro.recruiterName}
                  </footer>
                </blockquote>

                {app.inboxDecision === "pending" && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        app.setInboxDecision("accepted");
                        app.triggerToast("Intro accepted & contact shared");
                      }}
                      className="flex-1 py-3 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-xs font-semibold"
                    >
                      Accept &amp; Share Contact ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => app.setInboxDecision("declined")}
                      className="px-5 py-3 rounded-full bg-[#F6F0E4] text-[#6C6358] text-xs font-semibold"
                    >
                      Decline Silently
                    </button>
                  </div>
                )}

                {app.inboxDecision === "accepted" && (
                  <div className="rounded-2xl bg-[#E5EFEA] p-4 text-xs font-semibold text-[#2B6B5A] flex items-center justify-between">
                    <span>
                      ✓ Connected with {persona.sampleIntro.company}. Check your inbox.
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
                  <div className="rounded-2xl bg-[#F6F0E4] p-4 text-xs font-semibold text-[#6C6358] flex items-center justify-between">
                    <span>Quietly archived. Your identity stayed private.</span>
                    <button
                      type="button"
                      onClick={() => app.setInboxDecision("pending")}
                      className="underline ml-2 text-[#241F1A]"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 4: PRICING & PASSES                                       */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "pricing" && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D65A38] font-semibold">
                One-Time Editions · Zero Auto-Renewal
              </p>
              <h1 className="font-riso-serif font-bold text-3xl sm:text-5xl">
                Pay once, <span className="italic text-[#2B6B5A]">never subscribe</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#6C6358]">
                2 free ATS audits and free anonymous Talent Pool forever. Unlock full exports when you&apos;re ready.
              </p>
            </div>

            <div
              className={`grid gap-5 ${
                isMobile ? "grid-cols-1" : "grid-cols-3 items-stretch"
              }`}
            >
              {PRICING_TIERS.map((tier, idx) => (
                <div
                  key={tier.tier}
                  className={`rounded-[28px] p-6 border flex flex-col justify-between ${
                    tier.popular
                      ? "bg-[#FFFDF8] border-[#2B6B5A] shadow-[6px_6px_0_rgba(43,107,90,0.2)]"
                      : "bg-[#FFFDF8] border-[#241F1A]/12 shadow-[4px_4px_0_rgba(36,31,26,0.06)]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-riso-serif italic font-bold text-lg text-[#241F1A]">
                        0{idx + 1} · {tier.label}
                      </span>
                      {tier.popular && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FAEAE4] text-[#B94726] text-[10px] font-mono font-bold uppercase">
                          Most Chosen
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 border-b border-[#241F1A]/10 pb-4">
                      <span className="font-riso-serif text-4xl font-bold text-[#2B6B5A]">
                        ${tier.price}
                      </span>
                      <span className="text-xs text-[#6C6358]">
                        one-time · {tier.duration}
                      </span>
                    </div>

                    <p className="text-xs text-[#6C6358]">{tier.tagline}</p>

                    <ul className="space-y-2.5">
                      {tier.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2.5 text-xs font-medium text-[#241F1A]"
                        >
                          <span className="text-[#2B6B5A] font-bold">✦</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => app.activateDemoPass(tier.label)}
                    className={`mt-6 w-full py-3 rounded-full text-xs font-semibold transition-colors ${
                      tier.popular
                        ? "bg-[#2B6B5A] text-[#FFFDF8] hover:bg-[#23594a]"
                        : "bg-[#F6F0E4] text-[#241F1A] border border-[#241F1A]/15 hover:bg-[#E5EFEA]"
                    }`}
                  >
                    Choose {tier.label} →
                  </button>
                </div>
              ))}
            </div>

            {/* Editorial FAQ */}
            <div className="max-w-3xl mx-auto bg-[#FFFDF8] rounded-[28px] border border-[#241F1A]/12 divide-y divide-[#241F1A]/10 overflow-hidden">
              {PRICING_FAQS.map((faq, idx) => {
                const open = app.openFaqIdx === idx;
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => app.setOpenFaqIdx(open ? null : idx)}
                      className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left"
                    >
                      <span className="font-riso-serif font-bold text-base">
                        {faq.q}
                      </span>
                      <ProtoIcon
                        name="chevron"
                        size={16}
                        color="#2B6B5A"
                        className={`shrink-0 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {open && (
                      <div className="px-6 pb-4 text-xs text-[#6C6358] leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 5: ARCHIVE / PROFILE                                      */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "profile" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#FAEAE4] flex items-center justify-center">
                  <BrandTailorBot theme="risograph" state="celebrating" size={42} />
                </div>
                <div>
                  <h1 className="font-riso-serif font-bold text-2xl">
                    {persona.privateName}
                  </h1>
                  <p className="text-xs text-[#6C6358]">
                    {persona.privateEmail} · {app.activePassLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-[#FBF1DA] text-[#8E620C] text-xs font-semibold">
                  4-Day Craft Streak
                </span>
                <button
                  type="button"
                  onClick={() => app.setActivePage("agents")}
                  className="px-3.5 py-1.5 rounded-full bg-[#F6F0E4] border border-[#241F1A]/15 text-xs font-semibold"
                >
                  Recruiter API →
                </button>
              </div>
            </div>

            <div className="bg-[#FFFDF8] rounded-[28px] border border-[#241F1A]/12 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#241F1A]/10 flex items-center justify-between">
                <span className="font-riso-serif italic font-bold text-lg text-[#2B6B5A]">
                  Saved Resume Editions
                </span>
                <button
                  type="button"
                  onClick={() => {
                    app.setTailorView("input");
                    app.setActivePage("tailor");
                  }}
                  className="text-xs font-semibold text-[#D65A38]"
                >
                  + New Edition
                </button>
              </div>
              <div className="divide-y divide-[#241F1A]/10">
                {persona.savedResumes.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      app.setTailorView("results");
                      app.setActivePage("tailor");
                    }}
                    className="w-full px-6 py-4 flex items-center justify-between gap-3 hover:bg-[#F6F0E4]/50 text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="font-riso-serif italic font-bold text-base text-[#D65A38]">
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold">{item.roleTitle}</div>
                        <div className="text-xs text-[#6C6358]">
                          {item.company} · {item.updatedAt} · {item.aiToolsCount} AI tools
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#E5EFEA] text-[#2B6B5A] text-xs font-bold shrink-0">
                      {item.beforeScore}% → {item.afterScore}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* PAGE 6: RECRUITING AGENTS API HUB                              */}
        {/* -------------------------------------------------------------- */}
        {app.activePage === "agents" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#241F1A]/12 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#2B6B5A] font-semibold">
                Agent-Native Discovery · A2A &amp; OpenAPI 3.1
              </span>
              <h1 className="font-riso-serif font-bold text-3xl">
                For AI <span className="italic text-[#D65A38]">Recruiting Agents</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#6C6358]">
                Structured, zero-PII talent discovery with verifiable AI fluency and built-in double opt-in.
              </p>
            </div>

            <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
              {[
                { idx: "01", path: "/.well-known/agent.json", label: "A2A Agent Card", bg: "#E5EFEA" },
                { idx: "02", path: "/openapi.json", label: "OpenAPI 3.1 Spec", bg: "#FAEAE4" },
                { idx: "03", path: "/llms-full.txt", label: "LLM Context Index", bg: "#FBF1DA" },
              ].map((ep) => (
                <div
                  key={ep.path}
                  className="rounded-[24px] p-5 border border-[#241F1A]/10 space-y-1"
                  style={{ backgroundColor: ep.bg }}
                >
                  <span className="font-riso-serif italic font-bold text-sm text-[#241F1A]">
                    {ep.idx} · {ep.label}
                  </span>
                  <div className="text-xs font-mono text-[#4A4239]">{ep.path}</div>
                </div>
              ))}
            </div>

            <pre className="bg-[#241F1A] text-[#F6F0E4] rounded-[24px] p-5 text-xs font-mono overflow-x-auto leading-relaxed">
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
        <footer className="border-t border-[#241F1A]/10 mt-10 bg-[#FFFDF8]/70">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#6C6358]">
            <div className="flex items-center gap-2.5">
              <span className="font-riso-serif italic font-bold text-base text-[#2B6B5A]">
                Tailor Studio
              </span>
              <span>· Warm editorial craft for modern job searches</span>
            </div>
            <div className="flex items-center gap-5 font-semibold">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => app.setActivePage(item.id)}
                  className="hover:text-[#241F1A]"
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => app.setActivePage("agents")}
                className="hover:text-[#241F1A]"
              >
                API
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* ================================================================ */}
      {/* MOBILE EDITORIAL PAPER BOTTOM NAV                                */}
      {/* ================================================================ */}
      {isMobile && (
        <nav
          aria-label="Mobile editorial navigation"
          className="sticky bottom-0 z-30 bg-[#FFFDF8]/95 backdrop-blur-md border-t border-[#241F1A]/12 px-2 py-2.5 mt-auto"
        >
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map((item) => {
              const active = app.activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => app.setActivePage(item.id)}
                  className={`relative px-3 py-1 rounded-full flex flex-col items-center gap-0.5 text-[11px] font-semibold transition-colors ${
                    active ? "text-[#2B6B5A] bg-[#E5EFEA]" : "text-[#6C6358]"
                  }`}
                >
                  <ProtoIcon
                    name={item.icon}
                    size={16}
                    color={active ? "#2B6B5A" : "#6C6358"}
                    strokeWidth={1.9}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-[#D65A38] mt-0.5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* ================================================================ */}
      {/* MODAL: EXPORT PDF                                                */}
      {/* ================================================================ */}
      {app.exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export tailored PDF"
          className="fixed inset-0 z-[80] bg-[#241F1A]/45 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFDF8] border border-[#241F1A]/15 rounded-[28px] max-w-md w-full p-6 shadow-[6px_6px_0_rgba(43,107,90,0.22)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-riso-serif italic font-bold text-xl text-[#2B6B5A]">
                Print-Ready ATS Export
              </span>
              <button
                type="button"
                aria-label="Close export modal"
                onClick={() => app.setExportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F6F0E4] flex items-center justify-center"
              >
                <ProtoIcon name="close" size={14} color="#241F1A" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
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
                  className={`py-2.5 rounded-2xl text-xs font-semibold border transition-colors ${
                    app.pdfTemplate === tpl.id
                      ? "bg-[#E5EFEA] border-[#2B6B5A] text-[#2B6B5A]"
                      : "bg-[#F6F0E4]/70 border-transparent text-[#6C6358]"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6C6358] bg-[#F6F0E4]/75 rounded-2xl p-3.5">
              1 Page · {app.liveScore}% ATS Match · {app.approvedCount} curated edits · {app.selectedToolCount} AI tools
            </p>
            <button
              type="button"
              onClick={() => {
                app.setExportModalOpen(false);
                app.triggerToast(`Downloaded ${app.pdfTemplate} PDF edition`);
              }}
              className="w-full py-3 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-xs font-semibold"
            >
              Download PDF →
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: RECRUITER INTRO REQUEST                                   */}
      {/* ================================================================ */}
      {app.introModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Request verified intro"
          className="fixed inset-0 z-[80] bg-[#241F1A]/45 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFDF8] border border-[#241F1A]/15 rounded-[28px] max-w-md w-full p-6 shadow-[6px_6px_0_rgba(214,90,56,0.22)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-riso-serif italic font-bold text-xl text-[#241F1A]">
                Request Intro · {persona.publicId}
              </span>
              <button
                type="button"
                aria-label="Close intro modal"
                onClick={() => app.setIntroModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F6F0E4] flex items-center justify-center"
              >
                <ProtoIcon name="close" size={14} color="#241F1A" />
              </button>
            </div>
            <form onSubmit={app.submitIntroRequest} className="space-y-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="riso-recruiter-email"
                  className="text-xs font-bold text-[#241F1A]"
                >
                  Verified Company Email
                </label>
                <input
                  id="riso-recruiter-email"
                  type="email"
                  required
                  value={app.recruiterEmailInput}
                  onChange={(e) => app.setRecruiterEmailInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F0E4]/80 border border-[#241F1A]/15 text-sm"
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
                      className="px-2.5 py-1 rounded-full bg-[#F6F0E4] text-[10px] font-semibold text-[#6C6358] hover:text-[#241F1A]"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {app.introSubmitState === "blocked_free" && (
                <div className="rounded-2xl bg-[#FAEAE4] p-3 text-xs font-semibold text-[#B94726]">
                  Blocked: Please enter a verified company work email.
                </div>
              )}
              {app.introSubmitState === "blocked_employer" && (
                <div className="rounded-2xl bg-[#F6F0E4] p-3 text-xs font-semibold text-[#6C6358]">
                  Stealth Guard: Silently dropped — matches candidate&apos;s blocked employer.
                </div>
              )}
              {app.introSubmitState === "sent" && (
                <div className="rounded-2xl bg-[#E5EFEA] p-3 text-xs font-semibold text-[#2B6B5A]">
                  ✓ Sent! Candidate received your double-opt-in invitation.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#2B6B5A] text-[#FFFDF8] text-xs font-semibold"
              >
                Send Verified Request →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {app.toastMessage && (
        <div
          role="status"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-full bg-[#241F1A] text-[#FFFDF8] shadow-lg text-xs font-semibold whitespace-nowrap"
        >
          ✦ {app.toastMessage}
        </div>
      )}
    </div>
  );
}
