import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProgressRing } from "@/components/ProgressRing";
import { SessionTimer } from "@/components/SessionTimer";
import { RealtimeSessionsList } from "@/components/RealtimeSessionsList";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HabitDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HabitDetailPage({
  params,
}: HabitDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch habit with progress
  const { data: habit, error: habitError } = await supabase
    .from("habit_progress")
    .select("*")
    .eq("habit_id", id)
    .single();

  if (habitError || !habit) {
    notFound();
  }

  // Check if user owns this habit or is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (habit.owner_id !== user.id && !isAdmin) {
    redirect("/");
  }

  // Fetch active session for this habit
  const { data: activeSession } = await supabase
    .from("habit_sessions")
    .select("*")
    .eq("habit_id", id)
    .eq("owner_id", habit.owner_id)
    .in("status", ["active", "paused"])
    .maybeSingle();

  // Fetch completed sessions for this habit (exclude active/paused)
  const { data: sessions } = await supabase
    .from("habit_sessions")
    .select("*")
    .eq("habit_id", id)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(50);

  // Calculate "qualified today" (only count completed sessions)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: sessionsToday } = await supabase
    .from("habit_sessions")
    .select("minutes")
    .eq("habit_id", id)
    .eq("owner_id", habit.owner_id)
    .eq("status", "completed")
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString());

  const totalMinutesToday =
    sessionsToday?.reduce((sum, s) => sum + (s.minutes || 0), 0) || 0;
  const qualifiedToday = totalMinutesToday >= 20;

  const percentage = Math.min(100, (habit.total_minutes / habit.target_minutes) * 100);
  const isCompleted = habit.total_minutes >= habit.target_minutes;
  const remainingMinutes = Math.max(0, habit.target_minutes - habit.total_minutes);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{habit.title}</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-lg text-muted-foreground">
            <span className="font-semibold text-foreground">
              {habit.total_minutes}
            </span>{" "}
            / {habit.target_minutes} minutes
          </div>
          {qualifiedToday && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              ✓ Qualified today ({totalMinutesToday}m)
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              🎉 Cycle completed!
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Progress Ring */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Progress</h2>
          <div className="flex flex-col items-center justify-center gap-4">
            <ProgressRing percentage={percentage} size={160} strokeWidth={10} />
            {!isCompleted && (
              <p className="text-sm text-muted-foreground text-center">
                {remainingMinutes} minutes remaining
              </p>
            )}
          </div>
        </div>

        {/* Session Timer */}
        <SessionTimer
          habitId={id}
          initialSession={activeSession}
          disabled={isCompleted}
        />
      </div>

      {/* Sessions List with Realtime */}
      <RealtimeSessionsList habitId={id} initialSessions={sessions || []} />
    </div>
  );
}

