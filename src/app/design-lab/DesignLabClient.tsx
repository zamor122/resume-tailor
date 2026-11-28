"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DesignTheme, PersonaKey, ViewportMode } from "./prototypeData";
import { usePrototypeAppState } from "./PrototypeShared";
import PomegranateSite from "./PomegranateSite";
import RisographSite from "./RisographSite";

type StudioView = "desktop" | "mobile" | "compare";

export default function DesignLabClient({
  initialTheme = "pomegranate",
  initialView,
}: {
  initialTheme?: DesignTheme;
  initialView?: StudioView;
}) {
  const [theme, setTheme] = useState<DesignTheme>(initialTheme);
  const [personaKey, setPersonaKey] = useState<PersonaKey>("doctor");
  const [studioView, setStudioView] = useState<StudioView>(
    initialView ?? "desktop"
  );
  const [isSmallDevice, setIsSmallDevice] = useState(false);
  const [barHidden, setBarHidden] = useState(false);

  // Detect real phone viewport so phones get edge-to-edge native mobile UX
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsSmallDevice(mq.matches);
      if (mq.matches && !initialView) {
        setStudioView("mobile");
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [initialView]);

  const sharedApp = usePrototypeAppState(personaKey);

  const effectiveViewport: ViewportMode =
    isSmallDevice || studioView === "mobile" ? "mobile" : "desktop";

  return (
    <div className="fixed inset-0 z-[60] h-[100dvh] w-[100dvw] flex flex-col bg-[#14161D] overflow-hidden">
      {/* ================================================================ */}
      {/* COMPACT APPROVAL STUDIO CONTROL BAR                              */}
      {/* ================================================================ */}
      {!barHidden && (
        <div className="shrink-0 bg-[#14161D] text-white border-b border-white/10 px-3 sm:px-5 py-2.5 z-50">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            {/* Design Finalist Switcher (tablist) */}
            <div className="flex items-center gap-2 overflow-x-auto flex-nowrap">
              <span className="hidden lg:inline-block text-[10px] font-mono uppercase tracking-[0.2em] text-[#F7B93E] font-bold pr-1 shrink-0">
                Finalists
              </span>
              <div
                role="tablist"
                aria-label="Design finalist theme"
                className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10 shrink-0"
              >
                {(
                  [
                    {
                      id: "pomegranate" as const,
                      label: "01 · Pomegranate",
                      dots: ["#EA375D", "#FFFDF5", "#F7B93E"],
                    },
                    {
                      id: "risograph" as const,
                      label: "02 · Warm Paper Risograph",
                      dots: ["#F6F0E4", "#2B6B5A", "#D65A38"],
                    },
                  ]
                ).map((item) => {
                  const selected = theme === item.id && studioView !== "compare";
                  return (
                    <button
                      key={item.id}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => {
                        setTheme(item.id);
                        if (studioView === "compare") setStudioView("desktop");
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors border ${
                        selected
                          ? "bg-white text-[#14161D] border-white"
                          : "bg-transparent text-gray-300 border-transparent hover:text-white"
                      }`}
                    >
                      <span className="flex -space-x-1" aria-hidden="true">
                        {item.dots.map((c, idx) => (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-full border border-black/25"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Viewport & Persona Controls */}
            <div className="flex items-center gap-2 overflow-x-auto flex-nowrap">
              {/* Viewport Mode (Desktop screens can switch Desktop / Mobile Frame / Side-by-Side) */}
              {!isSmallDevice && (
                <div
                  role="tablist"
                  aria-label="Viewport mode"
                  className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 shrink-0"
                >
                  {(
                    [
                      { id: "desktop" as const, label: "Desktop Site" },
                      { id: "mobile" as const, label: "Mobile (390px)" },
                      { id: "compare" as const, label: "Compare Both" },
                    ]
                  ).map((v) => {
                    const selected = studioView === v.id;
                    return (
                      <button
                        key={v.id}
                        role="tab"
                        type="button"
                        aria-selected={selected}
                        onClick={() => setStudioView(v.id)}
                        className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          selected
                            ? "bg-[#F7B93E] text-[#14161D] border-[#F7B93E]"
                            : "text-gray-300 border-transparent hover:text-white"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Persona Toggle */}
              <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/10 shrink-0">
                {(
                  [
                    { id: "doctor" as const, label: "Physician" },
                    { id: "admin" as const, label: "Exec Asst" },
                  ]
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersonaKey(p.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      personaKey === p.id
                        ? "bg-white/20 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Standalone Direct Link + Hide Chrome Toggle */}
              <Link
                href={
                  theme === "pomegranate"
                    ? "/design-lab/pomegranate"
                    : "/design-lab/risograph"
                }
                className="hidden xl:inline-flex px-2.5 py-1.5 rounded-full text-[11px] font-mono text-gray-300 hover:text-white border border-white/15 shrink-0"
              >
                Direct URL ↗
              </Link>

              <button
                type="button"
                onClick={() => setBarHidden(true)}
                className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-gray-200 shrink-0"
              >
                Full Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Re-Open Studio Pill when Full Screen */}
      {barHidden && (
        <div className="fixed bottom-4 right-4 z-[95] flex items-center gap-1.5 bg-[#14161D]/90 backdrop-blur-md text-white px-2.5 py-1.5 rounded-full border border-white/20 shadow-xl">
          <button
            type="button"
            onClick={() =>
              setTheme((t) => (t === "pomegranate" ? "risograph" : "pomegranate"))
            }
            className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-bold"
          >
            Switch to {theme === "pomegranate" ? "Risograph" : "Pomegranate"}
          </button>
          <button
            type="button"
            onClick={() => setBarHidden(false)}
            className="px-2.5 py-1 rounded-full bg-[#F7B93E] text-[#14161D] text-[11px] font-extrabold"
          >
            Studio Bar
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* PROTOTYPE RENDER STAGE                                           */}
      {/* ================================================================ */}
      <div className="flex-1 overflow-y-auto proto-scroll">
        {/* CASE 1: SIDE-BY-SIDE COMPARE BOTH MOBILE PROTOTYPES ON DESKTOP */}
        {!isSmallDevice && studioView === "compare" ? (
          <div className="min-h-full py-8 px-6 flex flex-col items-center justify-start gap-5 bg-[#14161D]">
            <div className="text-center space-y-1 max-w-xl">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#F7B93E] font-bold">
                Side-by-Side Live Comparison
              </p>
              <p className="text-xs text-gray-300">
                Both phones are live-synced &amp; interactive — tap any tab (Tailor, Add AI, Talent, Passes, Profile) to compare both designs page-by-page.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start justify-items-center w-full max-w-5xl">
              {/* Phone 1: Pomegranate */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-white">
                    01 · Pomegranate Tactile
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("pomegranate");
                      setStudioView("desktop");
                    }}
                    className="text-[11px] font-bold text-[#EA375D] hover:underline"
                  >
                    Open Full Desktop →
                  </button>
                </div>
                <div className="w-[390px] h-[780px] rounded-[44px] p-2.5 bg-[#0A0C10] border border-white/15 shadow-2xl flex flex-col">
                  <div className="flex-1 rounded-[34px] overflow-y-auto proto-scroll bg-[#FFFDF5]">
                    <PomegranateSite app={sharedApp} viewport="mobile" />
                  </div>
                </div>
              </div>

              {/* Phone 2: Warm Paper Risograph */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-white">
                    02 · Warm Paper Risograph
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("risograph");
                      setStudioView("desktop");
                    }}
                    className="text-[11px] font-bold text-[#7DD3A8] hover:underline"
                  >
                    Open Full Desktop →
                  </button>
                </div>
                <div className="w-[390px] h-[780px] rounded-[44px] p-2.5 bg-[#0A0C10] border border-white/15 shadow-2xl flex flex-col">
                  <div className="flex-1 rounded-[34px] overflow-y-auto proto-scroll bg-[#F6F0E4]">
                    <RisographSite app={sharedApp} viewport="mobile" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !isSmallDevice && studioView === "mobile" ? (
          /* CASE 2: SINGLE INTERACTIVE 390px MOBILE PROTOTYPE ON DESKTOP */
          <div className="min-h-full py-7 px-4 flex flex-col items-center justify-start gap-4 bg-[#14161D]">
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <span className="font-bold text-white">
                {theme === "pomegranate"
                  ? "01 · Pomegranate Tactile"
                  : "02 · Warm Paper Risograph"}
              </span>
              <span>·</span>
              <span>Interactive 390px Mobile Prototype</span>
            </div>

            <div className="w-[398px] h-[812px] rounded-[46px] p-2.5 bg-[#0A0C10] border border-white/15 shadow-2xl flex flex-col">
              {/* Subtle iPhone dynamic island pill */}
              <div className="flex-1 rounded-[36px] overflow-y-auto proto-scroll relative">
                {theme === "pomegranate" ? (
                  <PomegranateSite app={sharedApp} viewport="mobile" />
                ) : (
                  <RisographSite app={sharedApp} viewport="mobile" />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* CASE 3: FULL EDGE-TO-EDGE SITE (DESKTOP ON LAPTOP, NATIVE MOBILE ON PHONE) */
          <div className="min-h-full w-full">
            {theme === "pomegranate" ? (
              <PomegranateSite app={sharedApp} viewport={effectiveViewport} />
            ) : (
              <RisographSite app={sharedApp} viewport={effectiveViewport} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
