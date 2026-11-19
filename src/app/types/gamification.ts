export interface DailyQuest {
  id: string;
  title: string;
  xpReward: number;
  completed: boolean;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  sfxEnabled: boolean;
  completedQuests: string[];
  totalTailoredCount: number;
  readArticleSlugs: string[];
  dailyPokes: number;
  lastPokeDate?: string;
  awardedActionKeys?: string[];
}

export interface XpNotification {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}
