"use client";

import { Trophy, Lock, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "streak" | "milestone";
  threshold: number;
  unlocked_at?: string | null;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number; // For locked achievements, show progress (0-100)
}

export function AchievementBadge({
  achievement,
  isUnlocked,
  progress,
}: AchievementBadgeProps) {
  const Icon = isUnlocked ? Trophy : Lock;
  const iconColor = isUnlocked
    ? "text-yellow-500"
    : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        isUnlocked
          ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-950/20 dark:to-orange-950/20 dark:border-yellow-800"
          : "bg-muted/50 border-muted"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-full p-2",
            isUnlocked ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-muted"
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                "text-sm font-semibold",
                isUnlocked ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {achievement.name}
            </h4>
            {isUnlocked && (
              <Award className="h-3 w-3 text-yellow-500" />
            )}
          </div>
          <p
            className={cn(
              "text-xs",
              isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
            )}
          >
            {achievement.description}
          </p>
          {!isUnlocked && progress !== undefined && (
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {progress.toFixed(0)}% complete
              </p>
            </div>
          )}
          {isUnlocked && achievement.unlocked_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Unlocked{" "}
              {new Date(achievement.unlocked_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

