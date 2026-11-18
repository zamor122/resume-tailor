"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { playAudioSfx, type SfxType } from "@/app/utils/audioSfx";
import type { GamificationState, DailyQuest, XpNotification } from "@/app/types/gamification";

const STORAGE_KEY = "resume_tailor_gamification_state";

export function calculateLevel(xp: number): number {
  if (xp >= 2000) return 5; // Offer Collector
  if (xp >= 1000) return 4; // Interview Magnet
  if (xp >= 500) return 3;  // ATS Assassin
  if (xp >= 200) return 2;  // Keyword Hunter
  return 1;                 // Resume Rookie
}

export function getLevelTitle(level: number): string {
  switch (level) {
    case 5: return "Offer Collector";
    case 4: return "Interview Magnet";
    case 3: return "ATS Assassin";
    case 2: return "Keyword Hunter";
    default: return "Resume Rookie";
  }
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export interface GamificationContextValue {
  xp: number;
  level: number;
  streak: number;
  sfxEnabled: boolean;
  quests: DailyQuest[];
  readArticleSlugs: string[];
  activeToast: XpNotification | null;
  awardXp: (amount: number, reason?: string) => void;
  completeQuest: (questId: string) => void;
  readArticle: (slug: string, title?: string) => boolean;
  pokeMascot: () => void;
  toggleSfx: () => void;
  playSfx: (type: SfxType) => void;
}

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export function GamificationProvider({
  children,
  initialXp = 350,
  initialStreak = 3,
}: {
  children: React.ReactNode;
  initialXp?: number;
  initialStreak?: number;
}) {
  const [xp, setXp] = useState(initialXp);
  const [level, setLevel] = useState(calculateLevel(initialXp));
  const [streak, setStreak] = useState(initialStreak);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [readArticleSlugs, setReadArticleSlugs] = useState<string[]>([]);
  const [dailyPokes, setDailyPokes] = useState(0);
  const [activeToast, setActiveToast] = useState<XpNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GamificationState>;
        const currentXp = typeof parsed.xp === "number" ? parsed.xp : initialXp;
        const today = getTodayString();
        setXp(currentXp);
        setLevel(calculateLevel(currentXp));
        setStreak(typeof parsed.streak === "number" ? parsed.streak : initialStreak);
        setSfxEnabled(parsed.sfxEnabled ?? true);
        if (Array.isArray(parsed.completedQuests)) {
          setCompletedQuestIds(parsed.completedQuests);
        }
        if (Array.isArray(parsed.readArticleSlugs)) {
          setReadArticleSlugs(parsed.readArticleSlugs);
        }
        if (parsed.lastPokeDate === today) {
          setDailyPokes(parsed.dailyPokes || 0);
        } else {
          setDailyPokes(0);
        }
      } else {
        // First visit baseline
        saveState({
          xp: initialXp,
          level: calculateLevel(initialXp),
          streak: initialStreak,
          lastActiveDate: getTodayString(),
          sfxEnabled: true,
          completedQuests: [],
          totalTailoredCount: 0,
          readArticleSlugs: [],
          dailyPokes: 0,
          lastPokeDate: getTodayString(),
        });
      }
    } catch {
      // LocalStorage unavailable
    }
  }, [initialXp, initialStreak]);

  const saveState = (newState: GamificationState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // LocalStorage write error
    }
  };

  const showToast = (amount: number, reason: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast({
      id: Math.random().toString(),
      amount,
      reason,
      timestamp: Date.now(),
    });
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 2800);
  };

  const awardXp = (amount: number, reason?: string) => {
    setXp((prev) => {
      const nextXp = prev + amount;
      const nextLevel = calculateLevel(nextXp);
      setLevel(nextLevel);
      saveState({
        xp: nextXp,
        level: nextLevel,
        streak,
        lastActiveDate: getTodayString(),
        sfxEnabled,
        completedQuests: completedQuestIds,
        totalTailoredCount: 0,
        readArticleSlugs,
        dailyPokes,
        lastPokeDate: getTodayString(),
      });
      return nextXp;
    });

    if (reason) {
      showToast(amount, reason);
    }
  };

  const readArticle = (slug: string, title?: string): boolean => {
    if (readArticleSlugs.includes(slug)) {
      return false;
    }
    const nextArticles = [...readArticleSlugs, slug];
    setReadArticleSlugs(nextArticles);

    // Award +25 XP for reading an article
    const earned = 25;
    const label = title ? `Read: ${title.slice(0, 24)}...` : "Field Manual Read";
    awardXp(earned, label);
    playSfx("success");
    completeQuest("read_manual");

    saveState({
      xp: xp + earned,
      level: calculateLevel(xp + earned),
      streak,
      lastActiveDate: getTodayString(),
      sfxEnabled,
      completedQuests: completedQuestIds.includes("read_manual") ? completedQuestIds : [...completedQuestIds, "read_manual"],
      totalTailoredCount: 0,
      readArticleSlugs: nextArticles,
      dailyPokes,
      lastPokeDate: getTodayString(),
    });

    return true;
  };

  const pokeMascot = () => {
    playSfx("boop");
    if (dailyPokes < 5) {
      const nextPokes = dailyPokes + 1;
      setDailyPokes(nextPokes);
      awardXp(5, `Bot Calibration (${nextPokes}/5)`);
      saveState({
        xp: xp + 5,
        level: calculateLevel(xp + 5),
        streak,
        lastActiveDate: getTodayString(),
        sfxEnabled,
        completedQuests: completedQuestIds,
        totalTailoredCount: 0,
        readArticleSlugs,
        dailyPokes: nextPokes,
        lastPokeDate: getTodayString(),
      });
    }
  };

  const completeQuest = (questId: string) => {
    if (!completedQuestIds.includes(questId)) {
      const nextCompleted = [...completedQuestIds, questId];
      setCompletedQuestIds(nextCompleted);
      saveState({
        xp,
        level,
        streak,
        lastActiveDate: getTodayString(),
        sfxEnabled,
        completedQuests: nextCompleted,
        totalTailoredCount: 0,
        readArticleSlugs,
        dailyPokes,
        lastPokeDate: getTodayString(),
      });
    }
  };

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      saveState({
        xp,
        level,
        streak,
        lastActiveDate: getTodayString(),
        sfxEnabled: next,
        completedQuests: completedQuestIds,
        totalTailoredCount: 0,
        readArticleSlugs,
        dailyPokes,
        lastPokeDate: getTodayString(),
      });
      return next;
    });
  };

  const playSfx = (type: SfxType) => {
    playAudioSfx(type, sfxEnabled);
  };

  const quests: DailyQuest[] = [
    {
      id: "scan_1",
      title: "Diagnose 1 Target Resume",
      xpReward: 100,
      completed: completedQuestIds.includes("scan_1"),
    },
    {
      id: "tailor_boost",
      title: "Boost Keyword Match Score",
      xpReward: 150,
      completed: completedQuestIds.includes("tailor_boost"),
    },
    {
      id: "read_manual",
      title: "Study 1 ATS Field Manual",
      xpReward: 25,
      completed: completedQuestIds.includes("read_manual") || readArticleSlugs.length > 0,
    },
  ];

  return (
    <GamificationContext.Provider
      value={{
        xp,
        level,
        streak,
        sfxEnabled,
        quests,
        readArticleSlugs,
        activeToast,
        awardXp,
        completeQuest,
        readArticle,
        pokeMascot,
        toggleSfx,
        playSfx,
      }}
    >
      {children}

      {/* Reactive XP Floating HUD Toast */}
      {activeToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[9999] pointer-events-none transition-all duration-300 transform translate-y-0 opacity-100"
        >
          <div className="neo-box bg-[#1C2028] text-white px-4 py-2.5 border-2 border-[#FF5722] shadow-[4px_4px_0px_#FF5722] flex items-center gap-3">
            <span className="text-[#F59E0B] text-lg font-mono font-bold animate-pulse">
              ⚡ +{activeToast.amount} XP
            </span>
            <div className="text-left font-mono">
              <span className="text-xs font-bold block text-white">
                {activeToast.reason}
              </span>
              <span className="text-[10px] text-gray-400 block">
                Total: {xp} XP • Level {level}
              </span>
            </div>
          </div>
        </div>
      )}
    </GamificationContext.Provider>
  );
}

const DEFAULT_GAMIFICATION_FALLBACK: GamificationContextValue = {
  streak: 1,
  xp: 0,
  level: 1,
  sfxEnabled: true,
  quests: [],
  readArticleSlugs: [],
  activeToast: null,
  awardXp: () => {},
  completeQuest: () => {},
  readArticle: () => false,
  pokeMascot: () => {},
  toggleSfx: () => {},
  playSfx: () => {},
};

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    return DEFAULT_GAMIFICATION_FALLBACK;
  }
  return ctx;
}
