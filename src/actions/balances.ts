"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { ensureProfile } from "@/lib/ensure-profile";
import {
  buildBalanceLedger,
  summarizeBalances,
  summarizeForUser,
} from "@/lib/balance/engine";
import type { Expense, Profile, Settlement } from "@/lib/types/database";

export async function getGroupBalances(groupId: string) {
  const supabase = await createClient();

  const [{ data: expenses }, { data: settlements }, { data: members }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select(
          `*,
          expense_participants (id, user_id, share_amount, share_percentage)`
        )
        .eq("group_id", groupId),
      supabase.from("settlements").select("*").eq("group_id", groupId),
      supabase
        .from("group_members")
        .select("profiles (id, email, full_name, avatar_url)")
        .eq("group_id", groupId),
    ]);

  const profiles =
    members
      ?.map((m) => {
        const profile = m.profiles;
        if (Array.isArray(profile)) return profile[0] as Profile | undefined;
        return profile as Profile | null;
      })
      .filter((p): p is Profile => p != null) ?? [];

  const ledger = buildBalanceLedger(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );

  return summarizeBalances(ledger, profiles);
}

export async function getDashboardBalances() {
  const user = await getAuthUser();
  if (!user) {
    return { totalOwed: 0, totalOwing: 0, netBalance: 0 };
  }

  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = memberships?.map((m) => m.group_id) ?? [];
  if (groupIds.length === 0) {
    return { totalOwed: 0, totalOwing: 0, netBalance: 0 };
  }

  // Batch: one expenses query + one settlements query instead of N+1
  const [{ data: expenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, expense_participants (id, user_id, share_amount)`)
      .in("group_id", groupIds),
    supabase.from("settlements").select("*").in("group_id", groupIds),
  ]);

  const ledger = buildBalanceLedger(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );

  return summarizeForUser(ledger, user.id);
}

export async function createSettlement(groupId: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated." };
  }

  await ensureProfile(user);
  const supabase = await createClient();

  const payerId = String(formData.get("payer_id") ?? "");
  const receiverId = String(formData.get("receiver_id") ?? "");
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "NZD");

  if (!payerId || !receiverId) {
    return { error: "Select both payer and receiver." };
  }

  if (payerId === receiverId) {
    return { error: "Payer and receiver must be different people." };
  }

  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  const { error } = await supabase.from("settlements").insert({
    group_id: groupId,
    payer_id: payerId,
    receiver_id: receiverId,
    amount,
    currency,
    note,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settlements`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getGroupSettlements(groupId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("settlements")
    .select(
      `
      *,
      payer:profiles!settlements_payer_id_fkey (id, email, full_name, avatar_url),
      receiver:profiles!settlements_receiver_id_fkey (id, email, full_name, avatar_url)
    `
    )
    .eq("group_id", groupId)
    .order("settled_at", { ascending: false });

  return data ?? [];
}
