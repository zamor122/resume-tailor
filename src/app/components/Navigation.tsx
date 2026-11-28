"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useGamification } from "@/app/contexts/GamificationContext";
import { useTheme } from "@/app/components/ThemeProvider";
import { getAccessInfo, formatRemainingTime } from "@/app/utils/accessManager";
import TailorBot from "./neo/TailorBot";
import DesignSwitcher from "./DesignSwitcher";

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
  const { design, toggleDesign } = useTheme();
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

  const isPom = design === "pomegranate";

  if (!mounted) {
    return (
      <header
        className={`h-16 w-full ${
          isPom
            ? "bg-[#EA375D] border-b-2 border-[#3A0C22]"
            : "bg-[#F6F0E4] border-b border-[#241F1A]/10"
        }`}
      />
    );
  }

  const hasActivePass = Boolean(accessInfo?.hasAccess && accessInfo.expiresAt);

  // Distraction-free funnel header for futureproof.airesumetailor.com & ad traffic
  if (isFunnelMode) {
    return (
      <header
        className={`sticky top-0 z-50 w-full transition-colors ${
          isPom
            ? "bg-[#EA375D] text-white border-b-2 border-[#3A0C22]"
            : "bg-[#F6F0E4]/95 backdrop-blur-sm text-[#241F1A] border-b border-[#241F1A]/10"
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isPom
                  ? "bg-[#FFFDF5] border-[1.75px] border-[#3A0C22]"
                  : "bg-[#FAEAE4] border border-[#D65A38]/25"
              }`}
            >
              <TailorBot size={24} state="idle" />
            </div>
            <span
              className={`font-bold text-sm sm:text-base tracking-tight ${
                isPom
                  ? "font-pom-display text-white"
                  : "font-riso-serif italic text-[#2B6B5A] text-lg"
              }`}
            >
              Futureproof{" "}
              <span
                className={`font-normal text-xs hidden sm:inline ${
                  isPom ? "text-white/85" : "text-[#6C6358]"
                }`}
              >
                by AI Resume Tailor
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DesignSwitcher variant="compact" className="hidden sm:inline-flex" />
            {hasActivePass ? (
              <span className="px-2.5 py-1 rounded-full bg-[#E6F7EF] border border-[#128C66]/40 text-[#125D44] text-xs font-bold">
                ✓ Pass Active
              </span>
            ) : (
              <Link
                href="/profile"
                className={`text-xs font-bold hover:underline ${
                  isPom ? "text-white" : "text-[#241F1A]"
                }`}
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
      className={`sticky top-0 z-50 w-full transition-colors ${
        isPom
          ? "bg-[#EA375D] border-b-[2px] border-[#3A0C22]"
          : "bg-[#F6F0E4]/95 backdrop-blur-sm border-b border-[#241F1A]/12"
      }`}
    >
      {/* Signature Pomegranate curved/layered berry ribbon accent along header bottom */}
      {isPom && (
        <div
          aria-hidden="true"
          className="h-1 w-full bg-[#C9224A] absolute bottom-0 inset-x-0 pointer-events-none"
        />
      )}

      <nav
        aria-label="Main Navigation"
        className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3 relative z-10"
      >
        {/* Left: Brand + TailorBot Medallion */}
        <Link
          href="/"
          onClick={() => playSfx("boop")}
          className="flex items-center gap-2.5 shrink-0 group"
          title="AI Resume Tailor"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              isPom
                ? "bg-[#FFFDF5] border-[2px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
                : "bg-[#FAEAE4] border border-[#D65A38]/25"
            }`}
          >
            <TailorBot size={28} state="idle" />
          </div>
          <span
            className={`font-bold text-base sm:text-lg tracking-tight whitespace-nowrap ${
              isPom
                ? "font-pom-display text-white"
                : "font-riso-serif italic text-[#2B6B5A] text-xl"
            }`}
            style={
              isPom
                ? {
                    textShadow:
                      "0 2px 0 #3A0C22, 1px 0 0 #3A0C22, -1px 0 0 #3A0C22, 0 -1px 0 #3A0C22",
                  }
                : undefined
            }
          >
            AI RESUME TAILOR
          </span>
        </Link>

        {/* Center: Primary Navigation Links (Desktop) */}
        <div
          className={`hidden md:flex items-center gap-1 ${
            isPom
              ? "bg-white border-[2px] border-[#3A0C22] rounded-full p-1 shadow-[0_3px_0_#3A0C22]"
              : ""
          }`}
        >
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => playSfx("click")}
                className={
                  isPom
                    ? `relative px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors ${
                        isActive
                          ? "bg-[#F6F1E4] text-[#3A0C22]"
                          : "text-[#7D4D61] hover:text-[#3A0C22] hover:bg-[#FFFDF5]"
                      }`
                    : `relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-[#FFFDF8] text-[#241F1A] border border-[#241F1A]/12"
                          : "text-[#6C6358] hover:text-[#241F1A]"
                      }`
                }
              >
                {label}
                {isActive && isPom && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA375D] border-[1.75px] border-[#3A0C22]"
                  />
                )}
                {isActive && !isPom && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] rounded-full bg-[#2B6B5A]"
                  />
                )}
              </Link>
            );
          })}
          <Link
            href="/futureproof"
            aria-current={pathname?.startsWith("/futureproof") ? "page" : undefined}
            onClick={() => playSfx("click")}
            className={
              isPom
                ? `relative px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors ${
                    pathname?.startsWith("/futureproof")
                      ? "bg-[#F6F1E4] text-[#3A0C22]"
                      : "text-[#EA375D] hover:bg-[#FFFDF5]"
                  }`
                : `relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    pathname?.startsWith("/futureproof")
                      ? "bg-[#FFFDF8] text-[#2B6B5A] border border-[#241F1A]/12"
                      : "text-[#D65A38] hover:text-[#241F1A]"
                  }`
            }
          >
            Add AI
            {pathname?.startsWith("/futureproof") && isPom && (
              <span
                aria-hidden="true"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA375D] border-[1.75px] border-[#3A0C22]"
              />
            )}
            {pathname?.startsWith("/futureproof") && !isPom && (
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] rounded-full bg-[#D65A38]"
              />
            )}
          </Link>
        </div>

        {/* Right: Instant Design Switcher + Primary CTA + Menu Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop / Tablet Segmented Design Switcher */}
          <DesignSwitcher variant="compact" className="hidden lg:inline-flex" />

          {/* Mobile / Compact 1-Tap Design Flip Pill */}
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              toggleDesign();
            }}
            aria-label={`Switch to ${isPom ? "Warm Paper Risograph" : "Pomegranate"} design`}
            title={`Switch to ${isPom ? "Warm Paper Risograph" : "Pomegranate"} design`}
            className={`lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              isPom
                ? "bg-white text-[#3A0C22] border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
                : "bg-[#FFFDF8] text-[#241F1A] border border-[#241F1A]/18"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/25 shrink-0"
              style={{ backgroundColor: isPom ? "#2B6B5A" : "#EA375D" }}
              aria-hidden="true"
            />
            <span className="inline">
              {isPom ? "Paper" : "Berry"}
            </span>
          </button>

          {user ? (
            <Link
              href="/profile"
              aria-current={pathname?.startsWith("/profile") ? "page" : undefined}
              onClick={() => playSfx("click")}
              className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isPom
                  ? "bg-white text-[#3A0C22] border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22] hover:bg-[#F6F1E4]"
                  : "bg-[#FFFDF8] text-[#241F1A] border border-[#241F1A]/15 hover:bg-[#E5EFEA]"
              }`}
            >
              {hasActivePass && (
                <span
                  className="w-2 h-2 rounded-full bg-[#128C66] shrink-0"
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
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  isPom
                    ? "text-white hover:bg-white/15"
                    : "text-[#6C6358] hover:text-[#241F1A]"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/#tailorResume"
                onClick={() => playSfx("click")}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-transform active:translate-y-0.5 ${
                  isPom
                    ? "bg-[#F7B93E] text-[#3A0C22] border-[1.75px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22] hover:bg-[#f9c65b]"
                    : "bg-[#2B6B5A] text-[#FFFDF8] shadow-[3px_3px_0_rgba(214,90,56,0.24)] hover:bg-[#225648]"
                }`}
              >
                Start Free
              </Link>
            </div>
          )}

          {/* Condensed Menu Button */}
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              setMenuOpen((o) => !o);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:translate-y-0.5 ${
              isPom
                ? "bg-white text-[#3A0C22] border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22] hover:bg-[#F6F1E4]"
                : "bg-[#FFFDF8] text-[#241F1A] border border-[#241F1A]/15 hover:bg-[#EFE8DA]"
            }`}
            aria-expanded={menuOpen}
            aria-controls="site-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            title="Menu, Design Switcher & Status"
          >
            {menuOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Condensed Dropdown Panel */}
      {menuOpen && (
        <div
          id="site-nav-menu"
          className={`md:absolute md:right-4 md:top-[calc(100%+8px)] md:w-80 md:rounded-[26px] px-4 py-4 flex flex-col gap-3.5 transition-colors ${
            isPom
              ? "bg-[#FFFDF5] text-[#3A0C22] border-t-[2px] md:border-[2px] border-[#3A0C22] md:shadow-[0_6px_0_#3A0C22]"
              : "bg-[#FFFDF8] text-[#241F1A] border-t md:border border-[#241F1A]/15 md:shadow-[6px_6px_0_rgba(43,107,90,0.16)]"
          }`}
        >
          {/* Full Visual Design Switcher inside Menu */}
          <DesignSwitcher variant="menu" />

          {/* Active Pass Time Limit */}
          {hasActivePass && accessInfo?.expiresAt && (
            <div className="p-3 rounded-2xl bg-[var(--design-success-tint)] border border-[var(--design-success)]/30 text-[var(--design-success)] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[var(--design-success)]" aria-hidden="true" />
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
            className={`p-3 rounded-2xl border transition-colors ${
              isPom
                ? "bg-[#FDE7EE] border-[#3A0C22]/25 hover:border-[#3A0C22] text-[#3A0C22]"
                : "bg-[#FAEAE4] border-[#D65A38]/25 hover:border-[#D65A38] text-[#241F1A]"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
              <span className={isPom ? "text-[#C41E46]" : "text-[#B94726]"}>
                NEW · FUTUREPROOF
              </span>
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
                  className={`px-3.5 py-2 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-[var(--design-accent)] text-[var(--design-accent-ink)]"
                      : "text-[var(--design-ink)] hover:bg-[var(--design-surface-tint)]"
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
              className={`px-3.5 py-2 rounded-full text-xs font-bold ${
                pathname?.startsWith("/profile")
                  ? "bg-[var(--design-accent)] text-[var(--design-accent-ink)]"
                  : "text-[var(--design-ink)] hover:bg-[var(--design-surface-tint)]"
              }`}
            >
              {user ? "Profile & Resumes" : "Sign In"}
            </Link>
            {!user && (
              <Link
                href="/#tailorResume"
                onClick={() => playSfx("click")}
                className="mt-1 neo-btn bg-[var(--design-accent)] text-[var(--design-accent-ink)] text-center px-4 py-2.5 text-xs font-extrabold"
              >
                Start Free
              </Link>
            )}
          </div>

          {/* Gamification Progress (condensed inside menu) */}
          <div className="p-3 rounded-2xl bg-[var(--design-surface-tint)]/80 border border-[var(--design-border-soft)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[var(--design-ink)]">
              <span aria-hidden="true">🔥</span>
              <span>{streak}D Streak</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#C9830A]">⚡ {xp} XP</span>
              <span className="bg-[var(--design-ink)] text-white px-2 py-0.5 rounded-full text-[10px]">
                L{level}
              </span>
            </div>
          </div>

          {/* Sound Effects Toggle */}
          <div className="pt-2 border-t border-[var(--design-border-soft)] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--design-ink-muted)] uppercase">
              Sound Effects
            </span>
            <button
              type="button"
              onClick={() => toggleSfx()}
              className="text-[11px] font-bold uppercase text-[var(--design-ink)] px-3 py-1 rounded-full border border-[var(--design-border-soft)] bg-[var(--design-surface)] hover:bg-[var(--design-surface-tint)]"
            >
              {sfxEnabled ? "SFX On" : "Muted"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
