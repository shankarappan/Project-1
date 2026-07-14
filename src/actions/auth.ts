"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/cached";

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for a magic link to sign in." };
}

export async function signInWithGoogle(redirectTo = "/dashboard") {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Could not start Google sign-in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentUser() {
  return getAuthUser();
}

export async function getCurrentProfile() {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function updateProfile(formData: FormData): Promise<void> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function seedDemoData() {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_demo_for_user", {
    target_user: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, message: "Demo data created." };
}

export async function seedDemoDataAction() {
  await seedDemoData();
}
