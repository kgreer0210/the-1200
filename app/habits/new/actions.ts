"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateHabitSchema = z.object({
  title: z.string().min(1).max(80),
  target_minutes: z.coerce.number().int().positive().default(1200),
});

export async function createHabit(formData: FormData) {
  const parsed = CreateHabitSchema.safeParse({
    title: formData.get("title"),
    target_minutes: formData.get("target_minutes") ?? 1200,
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: habit, error } = await supabase
    .from("habits")
    .insert({
      owner_id: user.id,
      title: parsed.data.title.trim(),
      target_minutes: parsed.data.target_minutes,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect(`/habits/${habit.id}`);
}

