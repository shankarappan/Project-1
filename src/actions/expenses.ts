"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateSplits, SplitValidationError } from "@/lib/splits/calculator";
import type { SplitType } from "@/lib/types/database";

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

interface ParticipantInput {
  userId: string;
  exactAmount?: number;
  percentage?: number;
}

export async function createExpense(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const paidBy = String(formData.get("paid_by") ?? "");
  const splitType = String(formData.get("split_type") ?? "equal") as SplitType;
  const expenseDate = String(formData.get("expense_date") ?? "");
  const currency = String(formData.get("currency") ?? "NZD");
  const participantIds = formData.getAll("participant_ids").map(String);

  if (!title) return { error: "Title is required." };
  if (!paidBy) return { error: "Select who paid." };
  if (isNaN(amount) || amount <= 0) return { error: "Enter a valid amount." };
  if (participantIds.length === 0) return { error: "Select at least one participant." };

  const participants: ParticipantInput[] = participantIds.map((userId) => {
    if (splitType === "exact") {
      return {
        userId,
        exactAmount: parseFloat(String(formData.get(`exact_${userId}`) ?? "0")),
      };
    }
    if (splitType === "percentage") {
      return {
        userId,
        percentage: parseFloat(String(formData.get(`pct_${userId}`) ?? "0")),
      };
    }
    return { userId };
  });

  let splits;
  try {
    splits = calculateSplits(amount, splitType, participants);
  } catch (err) {
    if (err instanceof SplitValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      paid_by: paidBy,
      created_by: user.id,
      title,
      description,
      amount,
      currency,
      split_type: splitType,
      expense_date: expenseDate || new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (error || !expense) {
    return { error: error?.message ?? "Failed to create expense." };
  }

  const participantRows = splits.map((split) => ({
    expense_id: expense.id,
    user_id: split.userId,
    share_amount: split.shareAmount,
    share_percentage: split.sharePercentage,
  }));

  const { error: participantError } = await supabase
    .from("expense_participants")
    .insert(participantRows);

  if (participantError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { error: participantError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function updateExpense(expenseId: string, groupId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const paidBy = String(formData.get("paid_by") ?? "");
  const splitType = String(formData.get("split_type") ?? "equal") as SplitType;
  const expenseDate = String(formData.get("expense_date") ?? "");
  const participantIds = formData.getAll("participant_ids").map(String);

  if (!title) return { error: "Title is required." };
  if (!paidBy) return { error: "Select who paid." };
  if (isNaN(amount) || amount <= 0) return { error: "Enter a valid amount." };

  const participants: ParticipantInput[] = participantIds.map((userId) => {
    if (splitType === "exact") {
      return {
        userId,
        exactAmount: parseFloat(String(formData.get(`exact_${userId}`) ?? "0")),
      };
    }
    if (splitType === "percentage") {
      return {
        userId,
        percentage: parseFloat(String(formData.get(`pct_${userId}`) ?? "0")),
      };
    }
    return { userId };
  });

  let splits;
  try {
    splits = calculateSplits(amount, splitType, participants);
  } catch (err) {
    if (err instanceof SplitValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      title,
      description,
      amount,
      paid_by: paidBy,
      split_type: splitType,
      expense_date: expenseDate,
    })
    .eq("id", expenseId);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("expense_participants").delete().eq("expense_id", expenseId);

  const participantRows = splits.map((split) => ({
    expense_id: expenseId,
    user_id: split.userId,
    share_amount: split.shareAmount,
    share_percentage: split.sharePercentage,
  }));

  const { error: participantError } = await supabase
    .from("expense_participants")
    .insert(participantRows);

  if (participantError) {
    return { error: participantError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}`);
  return { success: true };
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function getGroupExpenses(groupId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("expenses")
    .select(
      `
      *,
      paid_by_profile:profiles!expenses_paid_by_fkey (id, email, full_name, avatar_url),
      expense_participants (
        id,
        user_id,
        share_amount,
        share_percentage,
        profiles (id, email, full_name, avatar_url)
      )
    `
    )
    .eq("group_id", groupId)
    .order("expense_date", { ascending: false });

  return data ?? [];
}

export async function getExpense(expenseId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("expenses")
    .select(
      `
      *,
      paid_by_profile:profiles!expenses_paid_by_fkey (id, email, full_name, avatar_url),
      expense_participants (
        id,
        user_id,
        share_amount,
        share_percentage,
        profiles (id, email, full_name, avatar_url)
      )
    `
    )
    .eq("id", expenseId)
    .single();

  return data;
}

export async function getRecentActivity(limit = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = memberships?.map((m) => m.group_id) ?? [];
  if (groupIds.length === 0) return [];

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, title, amount, currency, group_id, created_at, created_by, groups(name), profiles!expenses_created_by_fkey(full_name)")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: settlements } = await supabase
    .from("settlements")
    .select("id, amount, currency, group_id, settled_at, created_by, groups(name), profiles!settlements_created_by_fkey(full_name)")
    .in("group_id", groupIds)
    .order("settled_at", { ascending: false })
    .limit(limit);

  const expenseItems =
    expenses?.map((e) => ({
      id: e.id,
      type: "expense" as const,
      title: e.title,
      amount: Number(e.amount),
      currency: e.currency,
      group_id: e.group_id,
      group_name: unwrapRelation(e.groups as { name: string } | { name: string }[] | null)?.name ?? "Group",
      created_at: e.created_at,
      actor_name: unwrapRelation(e.profiles as { full_name: string | null } | { full_name: string | null }[] | null)?.full_name ?? null,
    })) ?? [];

  const settlementItems =
    settlements?.map((s) => ({
      id: s.id,
      type: "settlement" as const,
      title: "Settlement recorded",
      amount: Number(s.amount),
      currency: s.currency,
      group_id: s.group_id,
      group_name: unwrapRelation(s.groups as { name: string } | { name: string }[] | null)?.name ?? "Group",
      created_at: s.settled_at,
      actor_name: unwrapRelation(s.profiles as { full_name: string | null } | { full_name: string | null }[] | null)?.full_name ?? null,
    })) ?? [];

  return [...expenseItems, ...settlementItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
