"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Session {
  id: string;
  habit_id: string;
  owner_id: string;
  started_at: string;
  minutes: number;
  note: string | null;
  status?: "active" | "paused" | "completed";
}

interface RealtimeSessionsListProps {
  habitId: string;
  initialSessions: Session[];
}

export function RealtimeSessionsList({
  habitId,
  initialSessions,
}: RealtimeSessionsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  useEffect(() => {
    const supabase = createClient();

    // Create a channel for this habit's sessions
    const channel = supabase
      .channel(`sessions:${habitId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "habit_sessions",
          filter: `habit_id=eq.${habitId}`,
        },
        (payload) => {
          // Update local state immediately for better UX
          // Only handle completed sessions
          if (payload.eventType === "INSERT") {
            const newSession = payload.new as Session;
            // Only add if it's a completed session
            if (newSession.status === "completed" && newSession.minutes) {
              setSessions((prev) => [newSession, ...prev].slice(0, 50)); // Keep only latest 50
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedSession = payload.new as Session;
            // If session was completed, add it; if it changed from completed to active/paused, remove it
            if (
              updatedSession.status === "completed" &&
              updatedSession.minutes
            ) {
              setSessions((prev) => {
                const exists = prev.find((s) => s.id === updatedSession.id);
                if (exists) {
                  // Update existing
                  return prev.map((s) =>
                    s.id === updatedSession.id ? updatedSession : s
                  );
                } else {
                  // Add new completed session
                  return [updatedSession, ...prev].slice(0, 50);
                }
              });
            } else {
              // Remove if it's no longer completed
              setSessions((prev) =>
                prev.filter((s) => s.id !== updatedSession.id)
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deletedSession = payload.old as Session;
            setSessions((prev) =>
              prev.filter((s) => s.id !== deletedSession.id)
            );
          }

          // Refresh the page to update progress, qualified today status, etc.
          startTransition(() => {
            router.refresh();
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [habitId, router]);

  // Also sync with server data when initialSessions change (e.g., after refresh)
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        Recent Sessions ({sessions.length})
        {isPending && (
          <span className="ml-2 text-xs text-muted-foreground">
            (updating...)
          </span>
        )}
      </h2>
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-4 py-3 border-b last:border-0"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {session.minutes} minute{session.minutes !== 1 ? "s" : ""}
                </div>
                {session.note && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {session.note}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(session.started_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No sessions logged yet.</p>
      )}
    </div>
  );
}
