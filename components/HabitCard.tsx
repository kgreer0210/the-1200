"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Session {
  id: string;
  habit_id: string;
  owner_id: string;
  started_at: string;
  status: "active" | "paused" | "completed";
  paused_at: string | null;
  paused_duration_seconds: number;
  minutes: number | null;
  note: string | null;
}

interface HabitCardProps {
  habitId: string;
  title: string;
  totalMinutes: number;
  targetMinutes: number;
  qualifiedToday?: boolean;
  activeSession?: Session | null;
}

export function HabitCard({
  habitId,
  title,
  totalMinutes,
  targetMinutes,
  qualifiedToday = false,
  activeSession: initialActiveSession = null,
}: HabitCardProps) {
  const [activeSession, setActiveSession] = useState<Session | null>(
    initialActiveSession
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<Session | null>(initialActiveSession);

  // Sync session state when prop changes
  useEffect(() => {
    setActiveSession(initialActiveSession);
    sessionRef.current = initialActiveSession;
  }, [initialActiveSession]);

  // Calculate elapsed time
  const calculateElapsedSeconds = (session: Session | null): number => {
    if (!session || session.status === "completed") return 0;

    const now = new Date();
    const startedAt = new Date(session.started_at);
    const elapsedMs = now.getTime() - startedAt.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    let totalPausedSeconds = session.paused_duration_seconds || 0;

    // If currently paused, add the time since paused_at
    if (session.status === "paused" && session.paused_at) {
      const pausedAt = new Date(session.paused_at);
      const pausedMs = now.getTime() - pausedAt.getTime();
      totalPausedSeconds += Math.floor(pausedMs / 1000);
    }

    return Math.max(0, elapsedSeconds - totalPausedSeconds);
  };

  // Update timer display
  useEffect(() => {
    sessionRef.current = activeSession;

    if (activeSession && activeSession.status === "active") {
      // Update immediately
      setElapsedSeconds(calculateElapsedSeconds(activeSession));

      // Then update every second
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsedSeconds(sessionRef.current));
      }, 1000);
    } else if (activeSession && activeSession.status === "paused") {
      // Just show the paused time, don't update
      setElapsedSeconds(calculateElapsedSeconds(activeSession));
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // No active session
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeSession]);

  // Realtime subscription for session updates
  useEffect(() => {
    if (!habitId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`habit-card-timer:${habitId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_sessions",
          filter: `habit_id=eq.${habitId}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const updatedSession = payload.new as Session;
            // Only update if this is an active/paused session
            if (
              updatedSession.status === "active" ||
              updatedSession.status === "paused"
            ) {
              setActiveSession(updatedSession);
              sessionRef.current = updatedSession;
            } else {
              // Session was completed, clear it
              setActiveSession(null);
              sessionRef.current = null;
            }
          } else if (payload.eventType === "DELETE") {
            // Session was deleted (reset)
            setActiveSession(null);
            sessionRef.current = null;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [habitId]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const percentage = Math.min(100, (totalMinutes / targetMinutes) * 100);
  const isCompleted = totalMinutes >= targetMinutes;

  return (
    <Link href={`/habits/${habitId}`}>
      <div
        className={cn(
          "group relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md",
          isCompleted &&
            "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
              {title}
            </h3>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">
                  {totalMinutes}
                </span>{" "}
                / {targetMinutes} minutes
              </div>
              {activeSession && activeSession.status === "active" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-mono font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    ⏱ {formatTime(elapsedSeconds)}
                  </span>
                </div>
              )}
              {activeSession && activeSession.status === "paused" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-mono font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    ⏸ {formatTime(elapsedSeconds)}
                  </span>
                </div>
              )}
              {qualifiedToday && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    ✓ Qualified today
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <ProgressRing percentage={percentage} size={80} strokeWidth={6} />
          </div>
        </div>
        {isCompleted && (
          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              🎉 Cycle completed!
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
