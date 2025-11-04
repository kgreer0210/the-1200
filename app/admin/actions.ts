"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Get all users with their roles (admin-only)
 */
export async function getAllUsers() {
  const admin = await isAdmin();

  if (!admin) {
    return { error: "Unauthorized: Admin access required" };
  }

  const supabase = await createClient();

  // Get all profiles (as admin, RLS allows this)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, created_at, timezone")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const usersWithRoles = profiles.map((profile) => ({
    ...profile,

    displayName:
      profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.email || "Unknown",
  }));

  return { data: usersWithRoles };
}

/**
 * Promote a user to admin (admin-only)
 */
export async function promoteToAdmin(userId: string) {
  const admin = await isAdmin();

  if (!admin) {
    return { error: "Unauthorized: Admin access required" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

/**
 * Remove admin role from a user (admin-only)
 */
export async function demoteFromAdmin(userId: string) {
  const admin = await isAdmin();

  if (!admin) {
    return { error: "Unauthorized: Admin access required" };
  }

  // Prevent demoting yourself
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === userId) {
    return { error: "Cannot demote yourself from admin" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}
