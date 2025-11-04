"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Update user profile with name information
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;

  if (!first_name || !last_name) {
    return { error: "First name and last name are required" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Check if user profile is complete (has name)
 */
export async function isProfileComplete(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  return !!(profile?.first_name && profile?.last_name);
}

