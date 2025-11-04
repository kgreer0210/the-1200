"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const LogSchema = z.object({
  minutes: z.coerce.number().int().positive().max(300),
  note: z.string().max(280).optional(),
});

export async function logSession(habitId: string, formData: FormData) {
  const parsed = LogSchema.safeParse({
    minutes: formData.get("minutes") ?? 20,
    note: formData.get("note") ?? undefined,
  });
  
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const supabase = await createClient();

  // defensive: ensure habit belongs to user
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Verify habit exists and belongs to user (or user is admin)
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id, owner_id")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) {
    return { ok: false, error: "Habit not found" };
  }

  // RLS will handle authorization, but we can add an extra check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (habit.owner_id !== me.user.id && !isAdmin) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("habit_sessions").insert({
    habit_id: habitId,
    owner_id: habit.owner_id, // Use the habit's owner_id, not the current user (for admin logging)
    minutes: parsed.data.minutes,
    note: parsed.data.note,
  });

  if (error) {
    return { ok: false, error: "Insert failed: " + error.message };
  }

  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/");
  return { ok: true };
}

// Helper function to check auth and habit ownership
async function checkHabitAccess(habitId: string) {
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();
  
  if (!me.user) {
    return { ok: false as const, error: "Not authenticated", supabase: null };
  }

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id, owner_id")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) {
    return { ok: false as const, error: "Habit not found", supabase: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (habit.owner_id !== me.user.id && !isAdmin) {
    return { ok: false as const, error: "Unauthorized", supabase: null };
  }

  return { ok: true as const, habit, ownerId: habit.owner_id, supabase };
}

export async function getActiveSession(habitId: string) {
  const check = await checkHabitAccess(habitId);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }
  const { supabase, ownerId } = check;

  const { data: session, error } = await supabase
    .from("habit_sessions")
    .select("*")
    .eq("habit_id", habitId)
    .eq("owner_id", ownerId)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Failed to fetch session: " + error.message };
  }

  return { ok: true, session: session || null };
}

export async function startSession(habitId: string) {
  const check = await checkHabitAccess(habitId);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }
  const { supabase, ownerId } = check;

  // Check if there's already an active/paused session
  const { data: existing } = await supabase
    .from("habit_sessions")
    .select("id")
    .eq("habit_id", habitId)
    .eq("owner_id", ownerId)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "A session is already in progress" };
  }

  const { data: session, error } = await supabase
    .from("habit_sessions")
    .insert({
      habit_id: habitId,
      owner_id: ownerId,
      status: "active",
      started_at: new Date().toISOString(),
      paused_duration_seconds: 0,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: "Failed to start session: " + error.message };
  }

  revalidatePath(`/habits/${habitId}`);
  return { ok: true, session };
}

export async function pauseSession(sessionId: string) {
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();

  if (!me.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Get the session
  const { data: session, error: fetchError } = await supabase
    .from("habit_sessions")
    .select("*, habit_id")
    .eq("id", sessionId)
    .eq("owner_id", me.user.id)
    .single();

  if (fetchError || !session) {
    return { ok: false, error: "Session not found" };
  }

  if (session.status !== "active") {
    return { ok: false, error: "Session is not active" };
  }

  const now = new Date();
  const pausedAt = now.toISOString();

  const { data: updatedSession, error } = await supabase
    .from("habit_sessions")
    .update({
      status: "paused",
      paused_at: pausedAt,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    return { ok: false, error: "Failed to pause session: " + error.message };
  }

  revalidatePath(`/habits/${session.habit_id}`);
  return { ok: true, session: updatedSession };
}

export async function resumeSession(sessionId: string) {
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();

  if (!me.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Get the session
  const { data: session, error: fetchError } = await supabase
    .from("habit_sessions")
    .select("*, habit_id")
    .eq("id", sessionId)
    .eq("owner_id", me.user.id)
    .single();

  if (fetchError || !session) {
    return { ok: false, error: "Session not found" };
  }

  if (session.status !== "paused") {
    return { ok: false, error: "Session is not paused" };
  }

  // Calculate paused duration: add time since paused_at to existing paused_duration_seconds
  const now = new Date();
  const pausedAt = session.paused_at ? new Date(session.paused_at) : now;
  const pausedDurationMs = now.getTime() - pausedAt.getTime();
  const pausedDurationSeconds = Math.floor(pausedDurationMs / 1000);
  const totalPausedSeconds = (session.paused_duration_seconds || 0) + pausedDurationSeconds;

  const { data: updatedSession, error } = await supabase
    .from("habit_sessions")
    .update({
      status: "active",
      paused_at: null,
      paused_duration_seconds: totalPausedSeconds,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    return { ok: false, error: "Failed to resume session: " + error.message };
  }

  revalidatePath(`/habits/${session.habit_id}`);
  return { ok: true, session: updatedSession };
}

const StopSessionSchema = z.object({
  note: z.string().max(280).optional(),
});

export async function stopSession(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();

  if (!me.user) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = StopSessionSchema.safeParse({
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  // Get the session
  const { data: session, error: fetchError } = await supabase
    .from("habit_sessions")
    .select("*, habit_id")
    .eq("id", sessionId)
    .eq("owner_id", me.user.id)
    .single();

  if (fetchError || !session) {
    return { ok: false, error: "Session not found" };
  }

  if (session.status === "completed") {
    return { ok: false, error: "Session is already completed" };
  }

  // Calculate elapsed time in seconds
  const now = new Date();
  const startedAt = new Date(session.started_at);
  const elapsedMs = now.getTime() - startedAt.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  // Subtract paused duration
  let totalPausedSeconds = session.paused_duration_seconds || 0;
  
  // If currently paused, add the time since paused_at
  if (session.status === "paused" && session.paused_at) {
    const pausedAt = new Date(session.paused_at);
    const pausedMs = now.getTime() - pausedAt.getTime();
    totalPausedSeconds += Math.floor(pausedMs / 1000);
  }

  const activeSeconds = Math.max(0, elapsedSeconds - totalPausedSeconds);
  const minutes = Math.floor(activeSeconds / 60);

  if (minutes < 1) {
    return { ok: false, error: "Session must be at least 1 minute long" };
  }

  const { data: updatedSession, error } = await supabase
    .from("habit_sessions")
    .update({
      status: "completed",
      minutes: minutes,
      note: parsed.data.note || null,
      paused_at: null,
      paused_duration_seconds: totalPausedSeconds,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    return { ok: false, error: "Failed to stop session: " + error.message };
  }

  revalidatePath(`/habits/${session.habit_id}`);
  revalidatePath("/");
  return { ok: true, session: updatedSession };
}

export async function resetSession(sessionId: string) {
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();

  if (!me.user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Get the session to get habit_id
  const { data: session, error: fetchError } = await supabase
    .from("habit_sessions")
    .select("habit_id")
    .eq("id", sessionId)
    .eq("owner_id", me.user.id)
    .single();

  if (fetchError || !session) {
    return { ok: false, error: "Session not found" };
  }

  const { error } = await supabase
    .from("habit_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("owner_id", me.user.id);

  if (error) {
    return { ok: false, error: "Failed to reset session: " + error.message };
  }

  revalidatePath(`/habits/${session.habit_id}`);
  return { ok: true };
}

