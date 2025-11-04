"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeDashboardUpdaterProps {
  userId: string;
  habitIds: string[];
}

export function RealtimeDashboardUpdater({
  userId,
  habitIds,
}: RealtimeDashboardUpdaterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (habitIds.length === 0) return;

    const supabase = createClient();

    // Create a channel that listens to all habit_sessions for this user's habits
    const channel = supabase
      .channel(`dashboard:${userId}`, {
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
          filter: `owner_id=eq.${userId}`,
        },
        () => {
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
  }, [userId, habitIds, router]);

  // This component doesn't render anything visible
  return null;
}
