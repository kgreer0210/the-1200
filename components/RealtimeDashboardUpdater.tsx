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
        (payload) => {
          console.log("Dashboard realtime update received:", payload);

          // Refresh the page to update progress, qualified today status, etc.
          startTransition(() => {
            router.refresh();
          });
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Dashboard subscribed to sessions for user ${userId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing dashboard channel:", err);
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Dashboard subscription timed out");
        } else if (status === "CLOSED") {
          console.warn("🔌 Dashboard channel closed");
        } else {
          console.log(`Dashboard channel status: ${status}`, err);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(`Unsubscribing dashboard for user ${userId}`);
      supabase.removeChannel(channel);
    };
  }, [userId, habitIds, router]);

  // This component doesn't render anything visible
  return null;
}

