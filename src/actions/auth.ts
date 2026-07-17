"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { mapAuthServiceError, validateEmail } from "@/lib/auth/email";
import { ensureProfile } from "@/lib/ensure-profile";
import {
  oauthProviderLabel,
  type OAuthProvider,
} from "@/lib/auth/oauth";
import { logger } from "@/lib/logging/logger";

export async function signInWithMagicLink(formData: FormData) {
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");
  const validation = validateEmail(String(formData.get("email") ?? ""));

  if (validation.code !== "ok") {
    return { error: validation.message ?? "Enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email: validation.email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      logger.warn("magic_link_failed", {
        code: error.status ?? "unknown",
        name: error.name,
      });
      return { error: mapAuthServiceError(error.message) };
    }

    return {
      success: true,
      message: "Check your email for a magic link to sign in.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network";
    logger.error("magic_link_exception", { reason: message.slice(0, 80) });
    return {
      error: mapAuthServiceError(message),
    };
  }
}

export async function signInWithOAuthProvider(
  provider: OAuthProvider,
  redirectTo = "/dashboard"
) {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`,
      queryParams:
        provider === "google"
          ? {
              access_type: "offline",
              prompt: "select_account",
            }
          : undefined,
    },
  });

  if (error) {
    logger.warn("oauth_sign_in_failed", {
      provider,
      name: error.name,
      code: error.status ?? "unknown",
    });

    const lower = error.message.toLowerCase();
    if (
      lower.includes("not enabled") ||
      lower.includes("unsupported provider") ||
      lower.includes("provider is not enabled")
    ) {
      return {
        error: `${oauthProviderLabel(provider)} sign-in isn’t enabled yet. Use a magic link, or ask an admin to configure ${oauthProviderLabel(provider)} SSO.`,
      };
    }

    return { error: mapAuthServiceError(error.message) };
  }

  if (data.url) {
    redirect(data.url);
  }

  return {
    error: `Could not start ${oauthProviderLabel(provider)} sign-in.`,
  };
}

/** @deprecated Prefer signInWithOAuthProvider("google") */
export async function signInWithGoogle(redirectTo = "/dashboard") {
  return signInWithOAuthProvider("google", redirectTo);
}

export async function signInWithApple(redirectTo = "/dashboard") {
  return signInWithOAuthProvider("apple", redirectTo);
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

  await ensureProfile(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.warn("get_profile_failed", { code: error.code ?? "unknown" });
    return null;
  }

  return data;
}

export async function updateProfile(formData: FormData) {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated. Please sign in again." };
  }

  await ensureProfile(user);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", user.id);

  if (error) {
    logger.warn("update_profile_failed", { code: error.code ?? "unknown" });
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, message: "Profile saved." };
}

async function seedDemoViaInserts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name: "Demo Flatmates", created_by: userId })
    .select("id")
    .single();

  if (groupError || !group) {
    return { error: groupError?.message ?? "Failed to create demo group." };
  }

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "admin",
  });

  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    return { error: memberError.message };
  }

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const expenses = [
    {
      title: "Weekly groceries",
      description: "Countdown run",
      amount: 85.5,
      date: today,
    },
    {
      title: "Power bill",
      description: null as string | null,
      amount: 142,
      date: weekAgo,
    },
  ];

  for (const item of expenses) {
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        group_id: group.id,
        paid_by: userId,
        created_by: userId,
        title: item.title,
        description: item.description,
        amount: item.amount,
        split_type: "equal",
        expense_date: item.date,
      })
      .select("id")
      .single();

    if (expenseError || !expense) {
      return {
        error: expenseError?.message ?? "Failed to create demo expense.",
      };
    }

    const { error: partError } = await supabase
      .from("expense_participants")
      .insert({
        expense_id: expense.id,
        user_id: userId,
        share_amount: item.amount,
        share_percentage: 100,
      });

    if (partError) {
      return { error: partError.message };
    }
  }

  return { success: true as const };
}

export async function seedDemoData() {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated. Please sign in again." };
  }

  await ensureProfile(user);
  const supabase = await createClient();

  const { error } = await supabase.rpc("seed_demo_for_user", {
    target_user: user.id,
  });

  if (error) {
    // Production may not have the SQL function yet — fall back to inserts.
    const missingFn =
      error.code === "PGRST202" ||
      /could not find the function|schema cache/i.test(error.message);

    if (!missingFn) {
      logger.warn("seed_demo_rpc_failed", { code: error.code ?? "unknown" });
      return {
        error: "Could not load demo data. Please try again.",
      };
    }

    logger.warn("seed_demo_rpc_missing_fallback", {
      code: error.code ?? "unknown",
    });
    const fallback = await seedDemoViaInserts(supabase, user.id);
    if (fallback.error) {
      return { error: fallback.error };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/groups");
  return { success: true, message: "Demo data created." };
}

export async function seedDemoDataAction() {
  return seedDemoData();
}
