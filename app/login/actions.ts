"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Login failed" };
  }

  // Check if profile is complete (has name), if not redirect to onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", data.user.id)
    .single();

  revalidatePath("/", "layout");

  // If profile is incomplete, redirect to onboarding
  if (!profile?.first_name || !profile?.last_name) {
    redirect("/onboarding");
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, user will need to confirm their email
  // If email confirmation is disabled, the user is automatically signed in
  if (data.user && !data.session) {
    return {
      success: true,
      message: "Please check your email to confirm your account.",
    };
  }

  // Profile is automatically created by the database trigger we set up
  // The trigger fires when a new user is inserted into auth.users
  // Check if profile is complete (has name), if not redirect to onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", data.user!.id)
    .single();

  revalidatePath("/", "layout");

  // If profile is incomplete, redirect to onboarding
  if (!profile?.first_name || !profile?.last_name) {
    redirect("/onboarding");
  }

  redirect("/");
}
