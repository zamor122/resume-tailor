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
      className="neo-box-sm bg-[#ECFDF5] text-[#065F46] px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 sm:gap-1.5 shrink-0"
      title={`${accessInfo.tierLabel || "Access"} - ${formatRemainingTime(
        accessInfo.expiresAt
      )}`}
    >
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#10B981] animate-ping shrink-0"></span>
      <span className="hidden lg:inline">Active</span>
      <span className="hidden md:inline">{formatRemainingTime(accessInfo.expiresAt)}</span>
      <span className="md:hidden uppercase tracking-wider">PRO</span>
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
    <header className="sticky top-0 z-50 bg-[#FAF7F0] border-b-2 border-[#1C2028] shadow-[0px_4px_0px_rgba(28,32,40,0.06)] w-full max-w-full overflow-hidden">
      {/* Top Telemetry Ticker */}
      <div className="bg-[#1C2028] text-white px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-mono tracking-wider flex items-center justify-between w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0"></span>
          <span className="text-[#10B981] font-bold shrink-0">RADAR: ONLINE</span>
          <span className="text-gray-500 hidden md:inline">|</span>
          <span className="text-gray-300 hidden md:inline truncate">
            WARM RETROFUTURISTIC AI RELEVANCY SYSTEM
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => toggleSfx()}
            className="text-gray-300 hover:text-white transition-colors uppercase font-bold text-[9px] sm:text-[10px] flex items-center gap-1"
            title="Toggle Mechanical SFX"
          >
            <span>{sfxEnabled ? "🔊 SFX ON" : "🔇 MUTED"}</span>
          </button>
          <span className="neo-tag bg-[#FF5722] text-white px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold">
            3 FREE
          </span>
        </div>
      </div>

      {/* Main Console Navigation Bar */}
      <nav aria-label="Main Navigation" role="navigation" className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 w-full">
        <div className="flex justify-between items-center gap-2 sm:gap-3">
          {/* Brand Logo with TailorBot Mascot */}
          <Link
            href="/"
            onClick={() => playSfx("boop")}
            className="flex items-center gap-2 sm:gap-2.5 group min-w-0 shrink"
            title="AI Resume Tailor"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 neo-box-sm bg-[#FF5722] flex items-center justify-center shrink-0">
              <TailorBot size={28} state="idle" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-xl tracking-tight block leading-none text-[#1C2028] truncate">
                AI RESUME TAILOR
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-600 font-mono font-bold tracking-wider uppercase block mt-0.5 truncate">
                Target Match Optimizer
              </span>
            </div>
          </Link>

          {/* Gamified Mission Status HUD */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Streak Counter (hidden on xs mobile) */}
            <div
              className="hidden sm:flex neo-box-sm bg-white px-2.5 py-1 items-center gap-1.5 text-xs font-bold font-mono shrink-0"
              title="Daily Application Streak"
            >
              <span className="text-orange-500">🔥</span>
              <span>{streak}D STREAK</span>
            </div>

            {/* XP Level Badge (compact on mobile) */}
            <div
              className="neo-box-sm bg-[#1C2028] text-white px-2 py-0.5 sm:px-3 sm:py-1 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold font-mono shrink-0"
              title="Mission Experience Points"
            >
              <span className="text-[#F59E0B]">⚡ {xp} XP</span>
              <span className="bg-[#FF5722] text-white px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] uppercase font-mono">
                L{level}
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
                <div className="flex items-center gap-2 ml-1">
                  <Link
                    href="/profile"
                    onClick={() => playSfx("click")}
                    className="neo-btn bg-white hover:bg-[#F4F1EA] text-[#1C2028] px-3.5 py-1.5 text-xs font-bold font-mono uppercase tracking-wider"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    href="/#tailorResume"
                    onClick={() => playSfx("click")}
                    className="neo-btn bg-[#FF5722] text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider"
                  >
                    ⚡ START FREE
                  </Link>
                </div>
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
            {/* Mobile Mission Status HUD Card */}
            <div className="p-3 mb-1 rounded-xl border-2 border-[#1C2028] bg-[#F4F1EA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-orange-500 text-lg">🔥</span>
                <div>
                  <div className="text-xs font-mono font-bold text-[#1C2028]">{streak}D STREAK</div>
                  <div className="text-[10px] text-gray-500 font-mono">Daily Application</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-[#F59E0B]">⚡ {xp} XP</div>
                <div className="text-[10px] text-gray-500 font-mono">Rank: Level {level}</div>
              </div>
            </div>
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
              <div className="flex flex-col gap-2 mt-1">
                <Link
                  href="/profile"
                  onClick={() => {
                    playSfx("click");
                    setMenuOpen(false);
                  }}
                  className="neo-btn bg-white text-[#1C2028] py-2.5 text-center text-sm font-bold font-mono uppercase tracking-wider"
                >
                  SIGN IN
                </Link>
                <Link
                  href="/#tailorResume"
                  onClick={() => {
                    playSfx("click");
                    setMenuOpen(false);
                  }}
                  className="neo-btn bg-[#FF5722] text-white py-3 text-center text-sm font-bold uppercase tracking-wider"
                >
                  ⚡ START FREE
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}