"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  resetSession,
  getActiveSession,
} from "@/app/habits/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

interface SessionTimerProps {
  habitId: string;
  initialSession: Session | null;
  disabled?: boolean;
}

export function SessionTimer({
  habitId,
  initialSession,
  disabled = false,
}: SessionTimerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<Session | null>(session);

  // Sync session state when initialSession prop changes (e.g., after refresh)
  useEffect(() => {
    setSession(initialSession);
    sessionRef.current = initialSession;
  }, [initialSession]);

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
    sessionRef.current = session;
    
    if (session && session.status === "active") {
      // Update immediately
      setElapsedSeconds(calculateElapsedSeconds(session));

      // Then update every second
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsedSeconds(sessionRef.current));
      }, 1000);
    } else if (session && session.status === "paused") {
      // Just show the paused time, don't update
      setElapsedSeconds(calculateElapsedSeconds(session));
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
  }, [session]);

  // Realtime subscription for session updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`timer-session:${habitId}`, {
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
        async (payload) => {
          console.log("Timer session update:", payload);

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const updatedSession = payload.new as Session;
            // Only update if this is an active/paused session
            if (
              updatedSession.status === "active" ||
              updatedSession.status === "paused"
            ) {
              setSession(updatedSession);
              sessionRef.current = updatedSession;
            } else {
              // Session was completed, clear it
              setSession(null);
              sessionRef.current = null;
              setShowSaveDialog(false);
            }
          } else if (payload.eventType === "DELETE") {
            // Session was deleted (reset)
            setSession(null);
            sessionRef.current = null;
            setShowResetDialog(false);
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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    setError(null);
    startTransition(async () => {
      const result = await startSession(habitId);
      if (result.ok) {
        setSession(result.session);
        router.refresh();
      } else {
        setError(result.error || "Failed to start session");
      }
    });
  };

  const handlePause = async () => {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const result = await pauseSession(session.id);
      if (result.ok) {
        setSession(result.session);
        router.refresh();
      } else {
        setError(result.error || "Failed to pause session");
      }
    });
  };

  const handleResume = async () => {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const result = await resumeSession(session.id);
      if (result.ok) {
        setSession(result.session);
        router.refresh();
      } else {
        setError(result.error || "Failed to resume session");
      }
    });
  };

  const handleStop = () => {
    if (!session) return;
    setNote("");
    setShowSaveDialog(true);
  };

  const handleSaveSession = async () => {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      if (note.trim()) {
        formData.set("note", note.trim());
      }
      const result = await stopSession(session.id, formData);
      if (result.ok) {
        setSession(null);
        setShowSaveDialog(false);
        setNote("");
        router.refresh();
      } else {
        setError(result.error || "Failed to save session");
      }
    });
  };

  const handleReset = () => {
    if (!session) return;
    setShowResetDialog(true);
  };

  const handleConfirmReset = async () => {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const result = await resetSession(session.id);
      if (result.ok) {
        setSession(null);
        setShowResetDialog(false);
        router.refresh();
      } else {
        setError(result.error || "Failed to reset session");
      }
    });
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const canSave = minutes >= 1;

  return (
    <>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Session Timer</h3>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {!session ? (
          // No active session - show start button
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-muted-foreground text-center">
              Start a timer to track your session
            </p>
            <Button
              onClick={handleStart}
              disabled={disabled || isPending}
              size="lg"
              className="w-full sm:w-auto"
            >
              Start Session
            </Button>
          </div>
        ) : (
          // Active or paused session - show timer and controls
          <div className="space-y-6">
            {/* Timer Display */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div
                className={cn(
                  "text-6xl font-mono font-bold",
                  session.status === "paused" && "text-muted-foreground"
                )}
              >
                {formatTime(elapsedSeconds)}
              </div>
              <div className="text-sm text-muted-foreground">
                {session.status === "active" && "Running"}
                {session.status === "paused" && "Paused"}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2 justify-center">
              {session.status === "active" && (
                <>
                  <Button
                    onClick={handlePause}
                    disabled={disabled || isPending}
                    variant="outline"
                  >
                    Pause
                  </Button>
                  <Button
                    onClick={handleStop}
                    disabled={disabled || isPending}
                    variant="default"
                  >
                    Stop
                  </Button>
                  <Button
                    onClick={handleReset}
                    disabled={disabled || isPending}
                    variant="destructive"
                  >
                    Reset
                  </Button>
                </>
              )}
              {session.status === "paused" && (
                <>
                  <Button
                    onClick={handleResume}
                    disabled={disabled || isPending}
                    variant="default"
                  >
                    Resume
                  </Button>
                  <Button
                    onClick={handleStop}
                    disabled={disabled || isPending}
                    variant="outline"
                  >
                    Stop
                  </Button>
                  <Button
                    onClick={handleReset}
                    disabled={disabled || isPending}
                    variant="destructive"
                  >
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Session</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Elapsed time: {minutes} minute{minutes !== 1 ? "s" : ""} (
              {formatTime(elapsedSeconds)})
            </p>

            {!canSave && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
                Session must be at least 1 minute long to save.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  type="text"
                  placeholder="Add a note..."
                  maxLength={280}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isPending}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNote("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSession}
                  disabled={disabled || isPending || !canSave}
                >
                  {isPending ? "Saving..." : "Save Session"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Reset Session?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will delete the current session and you'll lose all progress.
              This action cannot be undone.
            </p>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReset}
                disabled={disabled || isPending}
              >
                {isPending ? "Resetting..." : "Reset Session"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

