"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { playAudioSfx, type SfxType } from "@/app/utils/audioSfx";
import type { GamificationState, DailyQuest } from "@/app/types/gamification";

const STORAGE_KEY = "resume_tailor_gamification_state";

function calculateLevel(xp: number): number {
  if (xp >= 2000) return 5; // Offer Collector
  if (xp >= 1000) return 4; // Interview Magnet
  if (xp >= 500) return 3;  // ATS Assassin
  if (xp >= 200) return 2;  // Keyword Hunter
  return 1;                 // Resume Rookie
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

interface GamificationContextValue {
  xp: number;
  level: number;
  streak: number;
  sfxEnabled: boolean;
  quests: DailyQuest[];
  awardXp: (amount: number, reason?: string) => void;
  completeQuest: (questId: string) => void;
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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GamificationState>;
        const currentXp = typeof parsed.xp === "number" ? parsed.xp : initialXp;
        setXp(currentXp);
        setLevel(calculateLevel(currentXp));
        setStreak(typeof parsed.streak === "number" ? parsed.streak : initialStreak);
        setSfxEnabled(parsed.sfxEnabled ?? true);
        if (Array.isArray(parsed.completedQuests)) {
          setCompletedQuestIds(parsed.completedQuests);
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

  const awardXp = (amount: number, _reason?: string) => {
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
      });
      return nextXp;
    });
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
      title: "Scan & diagnose 1 target resume",
      xpReward: 100,
      completed: completedQuestIds.includes("scan_1"),
    },
    {
      id: "tailor_boost",
      title: "Achieve ATS Relevancy > 90%",
      xpReward: 150,
      completed: completedQuestIds.includes("tailor_boost"),
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
        awardXp,
        completeQuest,
        toggleSfx,
        playSfx,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return ctx;
}
