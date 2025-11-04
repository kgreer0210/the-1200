import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HabitCard } from "@/components/HabitCard";
import { RealtimeDashboardUpdater } from "@/components/RealtimeDashboardUpdater";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { isAdmin } from "@/lib/supabase/admin";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/app/actions";
import Image from "next/image";
import { copy } from "@/lib/copy";
import { FAQ } from "@/components/FAQ";

export default async function HomePage() {
  const supabase = await createClient();
  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch habits with progress
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: habits, error } = await supabase
    .from("habit_progress")
    .select("*")
    .eq("owner_id", user.id)
    .order("title");

  if (error) {
    console.error("Error fetching habits:", error);
  }

  // Calculate "qualified today" for each habit
  // For now, we'll fetch this separately - could be optimized with a view or RPC
  const habitsWithQualified = await Promise.all(
    (habits || []).map(async (habit) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: sessionsToday } = await supabase
        .from("habit_sessions")
        .select("minutes")
        .eq("habit_id", habit.habit_id)
        .eq("owner_id", user.id)
        .eq("status", "completed")
        .eq("session_type", "qualified") // Only count qualified sessions
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString());

      const totalMinutesToday =
        sessionsToday?.reduce((sum, s) => sum + (s.minutes || 0), 0) || 0;
      const qualifiedToday = totalMinutesToday >= 20;

      // Fetch active session for this habit
      const { data: activeSession } = await supabase
        .from("habit_sessions")
        .select("*")
        .eq("habit_id", habit.habit_id)
        .eq("owner_id", user.id)
        .in("status", ["active", "paused"])
        .maybeSingle();

      // Fetch streak data
      const { data: streakData } = await supabase
        .from("habit_streaks")
        .select("current_streak, longest_streak")
        .eq("habit_id", habit.habit_id)
        .eq("owner_id", user.id)
        .maybeSingle();

      // Fetch achievement count
      const { count: achievementCount } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("habit_id", habit.habit_id)
        .eq("user_id", user.id);

      return {
        ...habit,
        qualifiedToday,
        activeSession: activeSession || null,
        currentStreak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        achievementCount: achievementCount || 0,
      };
    })
  );

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Realtime updater - listens for session changes and refreshes the page */}
      <RealtimeDashboardUpdater
        userId={user.id}
        habitIds={habitsWithQualified.map((h) => h.habit_id)}
      />

      <div className="mb-8 space-y-4">
        {/* Logo and Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/" className="self-start sm:self-auto">
            <Image
              src="/logo.png"
              alt="THE 1200 Logo"
              width={180}
              height={72}
              priority
              className="h-auto"
            />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {copy.dashboard.title(
                `${profile?.first_name || ""} ${profile?.last_name || ""}`
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {copy.dashboard.subtitle}
            </p>
          </div>
        </div>
        {/* Buttons Section */}
        <div className="flex flex-wrap items-center gap-2">
          {(await isAdmin()) && (
            <Link href="/admin" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="hover:bg-slate-700 hover:text-white w-full sm:w-auto"
              >
                Admin Dashboard
              </Button>
            </Link>
          )}
          <Link href="/habits/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">+ New Habit</Button>
          </Link>
          <form action={signOut} className="w-full sm:w-auto">
            <Button
              type="submit"
              variant="outline"
              className="hover:bg-slate-700 hover:text-white w-full sm:w-auto"
            >
              <LogOutIcon className="w-4 h-4" />
              Log Out
            </Button>
          </form>
        </div>
      </div>

      {habitsWithQualified.length === 0 ? (
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="rounded-lg border bg-card p-6 sm:p-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">
              {copy.hero.h1}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-2xl mx-auto">
              {copy.hero.subhead}
            </p>
          </div>

          {/* How it works */}
          <div className="rounded-lg border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-4 text-center">
              {copy.howItWorks.title}
            </h2>
            <ul className="space-y-3 max-w-xl mx-auto">
              {copy.howItWorks.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-primary font-semibold mt-0.5">
                    {index + 1}.
                  </span>
                  <span className="text-muted-foreground">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why 20 hours */}
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {copy.why20Hours.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {copy.why20Hours.text}
            </p>
          </div>

          {/* FAQ */}
          <FAQ />

          {/* CTA */}
          <div className="rounded-lg border bg-card p-6 sm:p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">
              {copy.dashboard.emptyState.ctaTitle}
            </h2>
            <p className="text-muted-foreground mb-6">
              {copy.dashboard.emptyState.ctaDescription}
            </p>
            <Button asChild>
              <Link href="/habits/new">
                {copy.dashboard.emptyState.ctaButton}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {habitsWithQualified.map((habit) => (
            <HabitCard
              key={habit.habit_id}
              habitId={habit.habit_id}
              title={habit.title}
              totalMinutes={habit.total_minutes}
              targetMinutes={habit.target_minutes}
              cycleNumber={habit.cycle_number}
              qualifiedToday={habit.qualifiedToday}
              activeSession={habit.activeSession}
              currentStreak={habit.currentStreak}
              longestStreak={habit.longestStreak}
              achievementCount={habit.achievementCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
