import type { StreakStats } from "./streaks";
import type { AchievementId, Clip, UnlockedAchievement } from "./types";

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-snappit",
    title: "1st Film",
    description: "Save your first 7-second moment.",
  },
  {
    id: "streak-starter",
    title: "Streak Starter",
    description: "Keep a three-day streak going.",
  },
  {
    id: "week-keeper",
    title: "Week Keeper",
    description: "Keep a seven-day streak going.",
  },
  {
    id: "ten-clips",
    title: "Ten Moments",
    description: "Save ten clips.",
  },
];

export function evaluateAchievements(
  clips: Clip[],
  streak: StreakStats,
): AchievementId[] {
  const unlocked: AchievementId[] = [];
  if (clips.length >= 1) unlocked.push("first-snappit");
  if (streak.current >= 3 || streak.longest >= 3) unlocked.push("streak-starter");
  if (streak.current >= 7 || streak.longest >= 7) unlocked.push("week-keeper");
  if (clips.length >= 10) unlocked.push("ten-clips");
  return unlocked;
}

export function newlyUnlocked(
  previously: UnlockedAchievement[],
  nextIds: AchievementId[],
  now = Date.now(),
): UnlockedAchievement[] {
  const have = new Set(previously.map((item) => item.id));
  return nextIds
    .filter((id) => !have.has(id))
    .map((id) => ({ id, unlockedAt: now }));
}

export function achievementById(id: AchievementId): AchievementDef {
  const found = ACHIEVEMENTS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown achievement: ${id}`);
  }
  return found;
}
