"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useGamification } from "@/app/contexts/GamificationContext";

const MOBILE_TABS = [
  {
    href: "/",
    label: "Tailor",
    short: "TAILOR",
    match: (p: string) => p === "/",
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l2.1 5.6L19.5 11l-5.4 2.4L12 19l-2.1-5.6L4.5 11l5.4-2.4L12 3Z" />
      </svg>
    ),
  },
  {
    href: "/futureproof",
    label: "Futureproof",
    short: "FUTUREPROOF",
    match: (p: string) => p.startsWith("/futureproof"),
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="3" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      </svg>
    ),
  },
  {
    href: "/pricing",
    label: "Passes",
    short: "PASSES",
    match: (p: string) => p.startsWith("/pricing"),
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M3 10.5h18" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    short: "PROFILE",
    match: (p: string) => p.startsWith("/profile"),
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { design } = useTheme();
  const { playSfx } = useGamification();

  // Hide inside isolated prototype routes
  if (pathname.startsWith("/design-lab")) {
    return null;
  }

  const isPom = design === "pomegranate";

  if (isPom) {
    return (
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-3 inset-x-0 z-40 px-3 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-md mx-auto bg-white border-[2px] border-[#3A0C22] rounded-full px-2 py-1.5 flex items-center justify-around shadow-[0_6px_18px_rgba(58,12,34,0.16)]">
          {MOBILE_TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                onClick={() => playSfx("click")}
                className={`relative flex-1 py-1.5 rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? "bg-[#F6F1E4] text-[#3A0C22]" : "text-[#7D4D61]"
                }`}
              >
                {tab.icon(active ? "#EA375D" : "#3A0C22")}
                <span className="text-[9px] font-extrabold tracking-wide">
                  {tab.short}
                </span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA375D] border-[1.75px] border-[#3A0C22]"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF8]/95 backdrop-blur-md border-t border-[#241F1A]/12 px-2 py-2"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {MOBILE_TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              onClick={() => playSfx("click")}
              className={`relative px-3.5 py-1 rounded-full flex flex-col items-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? "text-[#2B6B5A] bg-[#E5EFEA]" : "text-[#6C6358]"
              }`}
            >
              {tab.icon(active ? "#2B6B5A" : "#6C6358")}
              <span>{tab.label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-[#D65A38]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
