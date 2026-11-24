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
      className="neo-box-sm bg-[#ECFDF5] text-[#065F46] px-2.5 py-1 text-[11px] font-mono font-bold flex items-center gap-1.5 shrink-0"
      title={`${accessInfo.tierLabel || "Access"} - ${formatRemainingTime(
        accessInfo.expiresAt
      )}`}
    >
      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" aria-hidden="true" />
      <span className="hidden md:inline">{formatRemainingTime(accessInfo.expiresAt)}</span>
      <span className="md:hidden uppercase tracking-wider">PRO</span>
    </div>
  );
}

const navLinks = [
  { href: "/", label: "Tailor" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { sfxEnabled, toggleSfx, playSfx } = useGamification();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  if (!mounted) {
    return <header className="h-16 bg-[#FAF7F0] border-b-2 border-[#1C2028]" />;
  }

  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F0] border-b-2 border-[#1C2028] shadow-[0px_3px_0px_rgba(28,32,40,0.06)] w-full">
      <nav
        aria-label="Main Navigation"
        className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4"
      >
        {/* Left: Compact Brand */}
        <Link
          href="/"
          onClick={() => playSfx("boop")}
          className="flex items-center gap-2.5 group min-w-0 shrink-0"
          title="AI Resume Tailor"
        >
          <div className="w-9 h-9 neo-box-sm bg-[#FF5722] flex items-center justify-center shrink-0">
            <TailorBot size={26} state="idle" />
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#1C2028] whitespace-nowrap">
            AI RESUME TAILOR
          </span>
        </Link>

        {/* Center: Primary Links (Desktop) */}
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

        {/* Right: Account / CTA + Mobile Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <AccessBadge />

          {user ? (
            <Link
              href="/profile"
              aria-current={pathname?.startsWith("/profile") ? "page" : undefined}
              onClick={() => playSfx("click")}
              className={`hidden md:inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wide border-2 border-[#1C2028] transition-colors ${
                pathname?.startsWith("/profile")
                  ? "bg-[#1C2028] text-white"
                  : "bg-white hover:bg-[#F4F1EA] text-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
              }`}
            >
              Profile
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

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              setMenuOpen((o) => !o);
            }}
            className="md:hidden neo-box-sm bg-white p-2 text-[#1C2028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C2028]"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden px-4 pb-4 pt-2 border-t-2 border-[#1C2028] bg-[#FAF7F0] flex flex-col gap-1.5"
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
            {user ? "Profile" : "Sign In"}
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

          <div className="pt-2 mt-1 border-t border-[#1C2028]/15 flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-600">Sound Effects</span>
            <button
              type="button"
              onClick={() => toggleSfx()}
              className="text-[11px] font-mono font-bold uppercase text-[#1C2028] px-2.5 py-1 rounded border border-[#1C2028] bg-white"
            >
              {sfxEnabled ? "SFX On" : "Muted"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
