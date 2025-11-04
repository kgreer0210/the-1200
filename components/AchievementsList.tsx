"use client";

import { AchievementBadge } from "./AchievementBadge";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "streak" | "milestone";
  threshold: number;
  unlocked_at?: string | null;
}

interface AchievementsListProps {
  achievements: Achievement[];
  currentStreak: number;
  totalMinutes: number;
}

export function AchievementsList({
  achievements,
  currentStreak,
  totalMinutes,
}: AchievementsListProps) {
  // Separate achievements by type
  const streakAchievements = achievements.filter((a) => a.type === "streak");
  const milestoneAchievements = achievements.filter(
    (a) => a.type === "milestone"
  );

  // Calculate progress for locked achievements
  const getProgress = (achievement: Achievement): number | undefined => {
    if (achievement.unlocked_at) return undefined; // Already unlocked

    if (achievement.type === "streak") {
      return Math.min(100, (currentStreak / achievement.threshold) * 100);
    } else if (achievement.type === "milestone") {
      return Math.min(100, (totalMinutes / achievement.threshold) * 100);
    }

    return undefined;
  };

  return (
    <div className="space-y-6">
      {streakAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Streak Achievements</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {streakAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                isUnlocked={!!achievement.unlocked_at}
                progress={getProgress(achievement)}
              />
            ))}
          </div>
        </div>
      )}

      {milestoneAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Milestone Achievements</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {milestoneAchievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                isUnlocked={!!achievement.unlocked_at}
                progress={getProgress(achievement)}
              />
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No achievements available yet.</p>
        </div>
      )}
    </div>
  );
}

