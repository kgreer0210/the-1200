import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProgressRing } from "@/components/ProgressRing";
import { SessionTimer } from "@/components/SessionTimer";
import { RealtimeSessionsList } from "@/components/RealtimeSessionsList";
import { StreakDisplay } from "@/components/StreakDisplay";
import { AchievementsList } from "@/components/AchievementsList";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { copy } from "@/lib/copy";

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

  // Calculate "qualified today" (only count qualified sessions)
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
    .eq("session_type", "qualified")  // Only count qualified sessions
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString());

  const totalMinutesToday =
    sessionsToday?.reduce((sum, s) => sum + (s.minutes || 0), 0) || 0;
  const qualifiedToday = totalMinutesToday >= 20;

  // Fetch streak data
  const { data: streakData } = await supabase
    .from("habit_streaks")
    .select("current_streak, longest_streak")
    .eq("habit_id", id)
    .eq("owner_id", habit.owner_id)
    .maybeSingle();

  const currentStreak = streakData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || 0;

  // Fetch all achievements with unlock status
  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*")
    .order("type, threshold");

  const { data: unlockedAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at")
    .eq("habit_id", id)
    .eq("user_id", habit.owner_id);

  // Combine achievements with unlock status
  const achievementsWithStatus =
    allAchievements?.map((achievement) => {
      const unlocked = unlockedAchievements?.find(
        (ua) => ua.achievement_id === achievement.id
      );
      return {
        ...achievement,
        unlocked_at: unlocked?.unlocked_at || null,
      };
    }) || [];

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
          {copy.habitDetail.backLink}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{habit.title}</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="text-base sm:text-lg text-muted-foreground">
            <span className="font-semibold text-foreground">
              {habit.total_minutes}
            </span>{" "}
            / {habit.target_minutes} minutes
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs sm:text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Cycle {habit.cycle_number}
            </span>
            {qualifiedToday && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs sm:text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {copy.habitDetail.qualifiedToday(totalMinutesToday)}
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs sm:text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {copy.habitDetail.cycleCompleted}
              </span>
            )}
          </div>
        </div>
        {!isCompleted && (
          <p className="text-sm text-muted-foreground mt-3">
            {copy.habitDetail.progressDescription}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Progress Ring */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Progress</h2>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="hidden sm:block">
              <ProgressRing percentage={percentage} size={160} strokeWidth={10} />
            </div>
            <div className="block sm:hidden">
              <ProgressRing percentage={percentage} size={140} strokeWidth={10} />
            </div>
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

      {/* Streak Display */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 shadow-sm mb-8">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Streak</h2>
        <StreakDisplay
          currentStreak={currentStreak}
          longestStreak={longestStreak}
        />
      </div>

      {/* Achievements */}
      <div className="rounded-lg border bg-card p-4 sm:p-6 shadow-sm mb-8">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Achievements</h2>
        <AchievementsList
          achievements={achievementsWithStatus}
          currentStreak={currentStreak}
          totalMinutes={habit.total_minutes}
        />
      </div>

      {/* Sessions List with Realtime */}
      <RealtimeSessionsList habitId={id} initialSessions={sessions || []} />
    </div>
  );
}

