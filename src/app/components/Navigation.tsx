"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useGamification } from "@/app/contexts/GamificationContext";
import { getAccessInfo, formatRemainingTime } from "@/app/utils/accessManager";
import TailorBot from "./neo/TailorBot";

const navLinks = [
  { href: "/", label: "Tailor" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { streak, xp, level, sfxEnabled, toggleSfx, playSfx } = useGamification();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFunnelMode, setIsFunnelMode] = useState(false);
  const [accessInfo, setAccessInfo] = useState<{
    hasAccess: boolean;
    expiresAt: Date | null;
    tierLabel: string | null;
  } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const onFutureproofSubdomain = host.startsWith("futureproof.");
    const onFutureproofCampaign =
      Boolean(pathname?.startsWith("/futureproof")) &&
      (params.has("utm_source") || params.get("funnel") === "1" || params.has("role"));
    setIsFunnelMode(onFutureproofSubdomain || onFutureproofCampaign);
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user?.id) {
      setAccessInfo(null);
      return;
    }
    let cancelled = false;
    getAccessInfo(user.id)
      .then((info) => {
        if (cancelled) return;
        if (info) {
          setAccessInfo({
            hasAccess: info.hasAccess && !info.isExpired,
            expiresAt: info.expiresAt,
            tierLabel: info.tierLabel,
          });
        } else {
          setAccessInfo(null);
        }
      })
      .catch(() => {
        if (!cancelled) setAccessInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen]);

  if (!mounted) {
    return <header className="h-16 bg-[#FAF7F0] border-b-2 border-[#1C2028]" />;
  }

  const hasActivePass = Boolean(accessInfo?.hasAccess && accessInfo.expiresAt);

  // Distraction-free funnel header for futureproof.airesumetailor.com & ad traffic
  if (isFunnelMode) {
    return (
      <header className="sticky top-0 z-50 bg-[#FAF7F0] border-b-2 border-[#1C2028] w-full">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 neo-box-sm bg-[#FF5722] flex items-center justify-center shrink-0">
              <TailorBot size={22} state="idle" />
            </div>
            <span className="font-mono font-extrabold text-sm sm:text-base tracking-tight text-[#1C2028]">
              FUTUREPROOF{" "}
              <span className="font-normal text-xs text-[#4B5563] hidden sm:inline">
                by AI Resume Tailor
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasActivePass ? (
              <span className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] border border-[#10B981] text-[#065F46] font-mono text-xs font-bold">
                ✓ Pass Active
              </span>
            ) : (
              <Link
                href="/profile"
                className="font-mono text-xs font-bold text-[#1C2028] hover:underline"
              >
                {user ? "My Account" : "Sign In"}
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      ref={menuContainerRef}
      className="sticky top-0 z-50 bg-[#FAF7F0] border-b-2 border-[#1C2028] shadow-[0px_3px_0px_rgba(28,32,40,0.06)] w-full"
    >
      <nav
        aria-label="Main Navigation"
        className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4"
      >
        {/* Left: Brand — never truncated */}
        <Link
          href="/"
          onClick={() => playSfx("boop")}
          className="flex items-center gap-2.5 shrink-0"
          title="AI Resume Tailor"
        >
          <div className="w-9 h-9 neo-box-sm bg-[#FF5722] flex items-center justify-center shrink-0">
            <TailorBot size={26} state="idle" />
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#1C2028] whitespace-nowrap">
            AI RESUME TAILOR
          </span>
        </Link>

        {/* Center: Clean Primary Links (Desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => playSfx("click")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wide transition-colors ${
                  isActive
                    ? "bg-[#1C2028] text-white"
                    : "text-[#1C2028] hover:bg-black/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: Primary Action + Compact Hamburger Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link
              href="/profile"
              aria-current={pathname?.startsWith("/profile") ? "page" : undefined}
              onClick={() => playSfx("click")}
              className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wide border-2 border-[#1C2028] transition-colors ${
                pathname?.startsWith("/profile")
                  ? "bg-[#1C2028] text-white"
                  : "bg-white hover:bg-[#F4F1EA] text-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
              }`}
            >
              {hasActivePass && (
                <span
                  className="w-2 h-2 rounded-full bg-[#10B981] shrink-0"
                  aria-hidden="true"
                />
              )}
              <span>Profile</span>
            </Link>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/profile"
                onClick={() => playSfx("click")}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wide text-[#1C2028] hover:bg-black/5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/#tailorResume"
                onClick={() => playSfx("click")}
                className="neo-btn bg-[#FF5722] hover:bg-[#E64A19] text-white px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wide border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
              >
                Start Free
              </Link>
            </div>
          )}

          {/* Condensed Menu Button (holds pass time limit, streak/XP, SFX, & mobile links) */}
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              setMenuOpen((o) => !o);
            }}
            className="neo-box-sm bg-white hover:bg-[#F4F1EA] p-2 text-[#1C2028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C2028]"
            aria-expanded={menuOpen}
            aria-controls="site-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            title="Menu & Account Status"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Condensed Dropdown Panel (Desktop right-aligned popover, Mobile full-width) */}
      {menuOpen && (
        <div
          id="site-nav-menu"
          className="md:absolute md:right-4 md:top-[calc(100%+6px)] md:w-72 md:rounded-xl md:border-2 md:border-[#1C2028] md:shadow-[4px_4px_0px_#1C2028] px-4 py-4 border-t-2 border-[#1C2028] bg-[#FAF7F0] flex flex-col gap-3"
        >
          {/* Active Pass Time Limit (moved out of top bar) */}
          {hasActivePass && accessInfo?.expiresAt && (
            <div className="p-3 rounded-lg bg-[#ECFDF5] border-2 border-[#1C2028] text-[#065F46] font-mono space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" aria-hidden="true" />
                <span>{accessInfo.tierLabel || "Active Pass"}</span>
              </div>
              <p className="text-xs font-bold">
                {formatRemainingTime(accessInfo.expiresAt)}
              </p>
            </div>
          )}

          {/* Standalone Futureproof Feature Link */}
          <Link
            href="/futureproof"
            aria-current={pathname?.startsWith("/futureproof") ? "page" : undefined}
            onClick={() => playSfx("click")}
            className={`p-3 rounded-lg border-2 border-[#1C2028] font-mono transition-colors ${
              pathname?.startsWith("/futureproof")
                ? "bg-[#1C2028] text-white"
                : "bg-[#FFF4EF] hover:bg-[#FFE8DD] text-[#1C2028]"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-[#FF5722]">NEW · FUTUREPROOF</span>
              <span>→</span>
            </div>
            <p className="text-xs font-bold mt-0.5">Add AI Skills to Resume</p>
          </Link>

          {/* Mobile Navigation Links */}
          <div className="md:hidden flex flex-col gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => playSfx("click")}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wide ${
                    isActive
                      ? "bg-[#1C2028] text-white"
                      : "text-[#1C2028] hover:bg-black/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/profile"
              aria-current={pathname?.startsWith("/profile") ? "page" : undefined}
              onClick={() => playSfx("click")}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wide ${
                pathname?.startsWith("/profile")
                  ? "bg-[#1C2028] text-white"
                  : "text-[#1C2028] hover:bg-black/5"
              }`}
            >
              {user ? "Profile & Resumes" : "Sign In"}
            </Link>
            {!user && (
              <Link
                href="/#tailorResume"
                onClick={() => playSfx("click")}
                className="mt-1 neo-btn bg-[#FF5722] text-white text-center px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wide border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
              >
                Start Free
              </Link>
            )}
          </div>

          {/* Gamification Progress (condensed inside menu) */}
          <div className="p-3 rounded-lg bg-white border border-[#1C2028]/30 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#1C2028]">
              <span aria-hidden="true">🔥</span>
              <span>{streak}D Streak</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#D97706]">⚡ {xp} XP</span>
              <span className="bg-[#1C2028] text-white px-1.5 py-0.5 rounded text-[10px]">
                L{level}
              </span>
            </div>
          </div>

          {/* Sound Effects Toggle */}
          <div className="pt-2 border-t border-[#1C2028]/15 flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-gray-600 uppercase">
              Sound Effects
            </span>
            <button
              type="button"
              onClick={() => toggleSfx()}
              className="text-[11px] font-mono font-bold uppercase text-[#1C2028] px-2.5 py-1 rounded border border-[#1C2028] bg-white hover:bg-[#F4F1EA]"
            >
              {sfxEnabled ? "SFX On" : "Muted"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
