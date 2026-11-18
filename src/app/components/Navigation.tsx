"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useGamification } from "@/app/contexts/GamificationContext";
import { getAccessInfo, formatRemainingTime } from "@/app/utils/accessManager";
import TailorBot from "./neo/TailorBot";

function AccessBadge() {
  const { user } = useAuth();
  const [accessInfo, setAccessInfo] = useState<{
    hasAccess: boolean;
    expiresAt: Date | null;
    tierLabel: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAccessInfo(null);
      return;
    }
    getAccessInfo(user.id).then((info) => {
      if (info) {
        setAccessInfo({
          hasAccess: info.hasAccess && !info.isExpired,
          expiresAt: info.expiresAt,
          tierLabel: info.tierLabel,
        });
      } else {
        setAccessInfo(null);
      }
    });
  }, [user?.id]);

  if (!accessInfo?.hasAccess || !accessInfo.expiresAt) return null;

  return (
    <div
      className="neo-box-sm bg-[#ECFDF5] text-[#065F46] px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0"
      title={`${accessInfo.tierLabel || "Access"} - ${formatRemainingTime(
        accessInfo.expiresAt
      )}`}
    >
      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
      <span className="hidden sm:inline">Active</span>
      <span>{formatRemainingTime(accessInfo.expiresAt)}</span>
    </div>
  );
}

const navLinks = [
  { href: "/", label: "Tailor Console" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/profile", label: "Profile" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { streak, xp, level, sfxEnabled, toggleSfx, playSfx } = useGamification();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!mounted) {
    return <nav className="h-16 bg-[#FAF7F0]"></nav>;
  }

  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F0] border-b-2 border-[#1C2028] shadow-[0px_4px_0px_rgba(28,32,40,0.06)]">
      {/* Top Telemetry Ticker */}
      <div className="bg-[#1C2028] text-white px-4 py-1.5 text-[11px] font-mono tracking-wider flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="text-[#10B981] font-bold">RADAR: ONLINE</span>
          <span className="text-gray-500 hidden md:inline">|</span>
          <span className="text-gray-300 hidden md:inline">
            WARM RETROFUTURISTIC AI RELEVANCY SYSTEM
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleSfx()}
            className="text-gray-300 hover:text-white transition-colors uppercase font-bold text-[10px] flex items-center gap-1"
            title="Toggle Mechanical SFX"
          >
            <span>{sfxEnabled ? "🔊 SFX ON" : "🔇 SFX MUTED"}</span>
          </button>
          <span className="neo-tag bg-[#FF5722] text-white px-2 py-0.5 text-[10px] font-bold">
            3 FREE
          </span>
        </div>
      </div>

      {/* Main Console Navigation Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center gap-3">
          {/* Brand Logo with TailorBot Mascot */}
          <Link
            href="/"
            onClick={() => playSfx("boop")}
            className="flex items-center gap-2.5 group"
            title="AI Resume Tailor"
          >
            <div className="w-10 h-10 neo-box-sm bg-[#FF5722] flex items-center justify-center shrink-0">
              <TailorBot size={32} state="idle" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight block leading-none text-[#1C2028]">
                AI RESUME TAILOR
              </span>
              <span className="text-[10px] text-gray-600 font-mono font-bold tracking-wider uppercase block mt-0.5">
                Target Match Optimizer
              </span>
            </div>
          </Link>

          {/* Gamified Mission Status HUD */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak Counter */}
            <div
              className="neo-box-sm bg-white px-3 py-1 flex items-center gap-1.5 text-xs font-bold font-mono"
              title="Daily Application Streak"
            >
              <span className="text-orange-500">🔥</span>
              <span>{streak}D STREAK</span>
            </div>

            {/* XP Level Badge */}
            <div
              className="neo-box-sm bg-[#1C2028] text-white px-3 py-1 flex items-center gap-2 text-xs font-bold font-mono"
              title="Mission Experience Points"
            >
              <span className="text-[#F59E0B]">⚡ {xp} XP</span>
              <span className="bg-[#FF5722] text-white px-1.5 py-0.2 rounded text-[10px] uppercase font-mono">
                LVL {level}
              </span>
            </div>

            <AccessBadge />

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-2 ml-2">
              {navLinks.map(({ href, label }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => playSfx("click")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                      isActive
                        ? "bg-[#1C2028] text-white neo-box-sm shadow-none"
                        : "text-[#1C2028] hover:bg-black/5"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}

              {!user && (
                <Link
                  href="/#tailorResume"
                  onClick={() => playSfx("click")}
                  className="neo-btn bg-[#FF5722] text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider ml-1"
                >
                  ⚡ START FREE
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setMenuOpen((o) => !o);
              }}
              className="lg:hidden neo-box-sm bg-white p-2 text-[#1C2028] focus:outline-none"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t-2 border-[#1C2028] flex flex-col gap-2">
            {navLinks.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    playSfx("click");
                    setMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-sm font-mono font-bold uppercase neo-box-sm ${
                    isActive
                      ? "bg-[#1C2028] text-white"
                      : "bg-white text-[#1C2028]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {!user && (
              <Link
                href="/#tailorResume"
                onClick={() => {
                  playSfx("click");
                  setMenuOpen(false);
                }}
                className="neo-btn bg-[#FF5722] text-white py-3 text-center text-sm font-bold uppercase tracking-wider mt-1"
              >
                ⚡ START FREE
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}