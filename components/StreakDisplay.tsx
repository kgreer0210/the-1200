"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  className,
}: StreakDisplayProps) {
  const hasActiveStreak = currentStreak > 0;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5">
        <Flame
          className={cn(
            "h-3 w-3",
            hasActiveStreak
              ? "text-orange-500 fill-orange-500"
              : "text-muted-foreground"
          )}
        />
        <span className="text-xs font-medium text-foreground">
          {currentStreak} day{currentStreak !== 1 ? "s" : ""}
        </span>
      </div>
      {longestStreak > currentStreak && (
        <span className="text-xs text-muted-foreground ml-4">
          Best: {longestStreak}
        </span>
      )}
    </div>
  );
}

