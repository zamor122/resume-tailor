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
}
