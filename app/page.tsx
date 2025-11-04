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

      return {
        ...habit,
        qualifiedToday,
        activeSession: activeSession || null,
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

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="THE 1200 Logo"
              width={120}
              height={48}
              priority
              className="h-auto"
            />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {profile?.first_name} {profile?.last_name}&apos;s Habits
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your progress toward 1200 minutes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(await isAdmin()) && (
            <Link href="/admin">
              <Button
                variant="outline"
                className="hover:bg-slate-700 hover:text-white"
              >
                Admin Dashboard
              </Button>
            </Link>
          )}
          <Link href="/habits/new">
            <Button>+ New Habit</Button>
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="hover:bg-slate-700 hover:text-white"
            >
              <LogOutIcon className="w-4 h-4" />
              Log Out
            </Button>
          </form>
        </div>
      </div>

      {habitsWithQualified.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No habits yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first habit to start tracking your progress.
          </p>
          <Button asChild>
            <Link href="/habits/new">Create Your First Habit</Link>
          </Button>
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
              qualifiedToday={habit.qualifiedToday}
              activeSession={habit.activeSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}
