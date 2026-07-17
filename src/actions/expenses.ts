"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { ensureProfile } from "@/lib/ensure-profile";
import { calculateSplits, SplitValidationError } from "@/lib/splits/calculator";
import { MoneyParseError, parseMoneyToCents, parsePercentageToCentipercent, centsToDollars } from "@/lib/money/cents";
import { requireGroupMember } from "@/lib/auth/membership";
import { logger } from "@/lib/logging/logger";
import type { SplitType } from "@/lib/types/database";

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

interface ParticipantInput {
  userId: string;
  exactAmountCents?: number;
  percentageCentipercent?: number;
}

function parseParticipants(
  formData: FormData,
  splitType: SplitType,
  participantIds: string[]
): ParticipantInput[] {
  return participantIds.map((userId) => {
    if (splitType === "exact") {
      const raw = formData.get(`exact_${userId}`);
      if (raw == null || String(raw).trim() === "") {
        throw new SplitValidationError(
          "Each participant needs a valid exact amount."
        );
      }
      return {
        userId,
        exactAmountCents: parseMoneyToCents(String(raw)),
      };
    }
    if (splitType === "percentage") {
      const raw = formData.get(`pct_${userId}`);
      if (raw == null || String(raw).trim() === "") {
        throw new SplitValidationError(
          "Each participant needs a valid percentage."
        );
      }
      return {
        userId,
        percentageCentipercent: parsePercentageToCentipercent(String(raw)),
      };
    }
    return { userId };
  });
}

export async function createExpense(groupId: string, formData: FormData) {
  const user = await getAuthUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  await ensureProfile(user);
  const supabase = await createClient();

  const membership = await requireGroupMember(supabase, groupId, user.id);
  if (!membership.ok) {
    return { error: membership.error };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "");
  const paidBy = String(formData.get("paid_by") ?? "");
  const splitType = String(formData.get("split_type") ?? "equal") as SplitType;
  const expenseDate = String(formData.get("expense_date") ?? "");
  const currency = String(formData.get("currency") ?? "NZD");
  const clientRequestId =
    String(formData.get("client_request_id") ?? "").trim() || null;
  const participantIds = formData.getAll("participant_ids").map(String);

  if (!title) return { error: "Title is required." };
  if (!paidBy) return { error: "Select who paid." };
  if (participantIds.length === 0) {
    return { error: "Select at least one participant." };
  }

  let amountCents: number;
  try {
    amountCents = parseMoneyToCents(amountRaw);
  } catch (err) {
    return {
      error:
        err instanceof MoneyParseError
          ? err.message
          : "Enter a valid amount.",
    };
  }

  if (amountCents <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  let participants: ParticipantInput[];
  try {
    participants = parseParticipants(formData, splitType, participantIds);
  } catch (err) {
    if (err instanceof SplitValidationError || err instanceof MoneyParseError) {
      return { error: err.message };
    }
    throw err;
  }

  let splits;
  try {
    splits = calculateSplits(0, splitType, participants, {
      totalAmountCents: amountCents,
    });
  } catch (err) {
    if (err instanceof SplitValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  const amount = centsToDollars(amountCents);
  const participantPayload = splits.map((split) => ({
    user_id: split.userId,
    share_amount: split.shareAmount,
    share_percentage:
      split.sharePercentage == null ? "" : String(split.sharePercentage),
  }));

  const { data: expenseId, error } = await supabase.rpc("create_expense_atomic", {
    p_group_id: groupId,
    p_paid_by: paidBy,
    p_created_by: user.id,
    p_title: title,
    p_description: description,
    p_amount: amount,
    p_currency: currency,
    p_split_type: splitType,
    p_expense_date: expenseDate || new Date().toISOString().split("T")[0],
    p_client_request_id: clientRequestId,
    p_participants: participantPayload,
  });

  if (error || !expenseId) {
    // Fallback for environments where migration 003 is not applied yet
    if (error?.message?.includes("create_expense_atomic") || error?.code === "PGRST202") {
      return createExpenseLegacy(supabase, {
        groupId,
        userId: user.id,
        title,
        description,
        amount,
        currency,
        paidBy,
        splitType,
        expenseDate,
        clientRequestId,
        splits,
      });
    }
    logger.error("create_expense_failed", {
      code: error?.code ?? "unknown",
      groupId,
    });
    return { error: error?.message ?? "Failed to create expense." };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

async function createExpenseLegacy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    groupId: string;
    userId: string;
    title: string;
    description: string | null;
    amount: number;
    currency: string;
    paidBy: string;
    splitType: SplitType;
    expenseDate: string;
    clientRequestId: string | null;
    splits: { userId: string; shareAmount: number; sharePercentage: number | null }[];
  }
) {
  if (args.clientRequestId) {
    const { data: existing } = await supabase
      .from("expenses")
      .select("id")
      .eq("created_by", args.userId)
      .eq("client_request_id", args.clientRequestId)
      .maybeSingle();

    if (existing) {
      revalidatePath(`/groups/${args.groupId}`);
      redirect(`/groups/${args.groupId}`);
    }
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: args.groupId,
      paid_by: args.paidBy,
      created_by: args.userId,
      title: args.title,
      description: args.description,
      amount: args.amount,
      currency: args.currency,
      split_type: args.splitType,
      expense_date:
        args.expenseDate || new Date().toISOString().split("T")[0],
      ...(args.clientRequestId
        ? { client_request_id: args.clientRequestId }
        : {}),
    })
    .select("id")
    .single();

  if (error || !expense) {
    if (error?.code === "23505" && args.clientRequestId) {
      revalidatePath(`/groups/${args.groupId}`);
      redirect(`/groups/${args.groupId}`);
    }
    return { error: error?.message ?? "Failed to create expense." };
  }

  const participantRows = args.splits.map((split) => ({
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

  revalidatePath(`/groups/${args.groupId}`);
  redirect(`/groups/${args.groupId}`);
}

export async function updateExpense(
  expenseId: string,
  groupId: string,
  formData: FormData
) {
  const user = await getAuthUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const supabase = await createClient();
  const membership = await requireGroupMember(supabase, groupId, user.id);
  if (!membership.ok) {
    return { error: membership.error };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "");
  const paidBy = String(formData.get("paid_by") ?? "");
  const splitType = String(formData.get("split_type") ?? "equal") as SplitType;
  const expenseDate = String(formData.get("expense_date") ?? "");
  const participantIds = formData.getAll("participant_ids").map(String);

  if (!title) return { error: "Title is required." };
  if (!paidBy) return { error: "Select who paid." };
  if (participantIds.length === 0) {
    return { error: "Select at least one participant." };
  }

  let amountCents: number;
  try {
    amountCents = parseMoneyToCents(amountRaw);
  } catch (err) {
    return {
      error:
        err instanceof MoneyParseError
          ? err.message
          : "Enter a valid amount.",
    };
  }

  if (amountCents <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  let participants: ParticipantInput[];
  try {
    participants = parseParticipants(formData, splitType, participantIds);
  } catch (err) {
    if (err instanceof SplitValidationError || err instanceof MoneyParseError) {
      return { error: err.message };
    }
    throw err;
  }

  let splits;
  try {
    splits = calculateSplits(0, splitType, participants, {
      totalAmountCents: amountCents,
    });
  } catch (err) {
    if (err instanceof SplitValidationError) {
      return { error: err.message };
    }
    throw err;
  }

  const amount = centsToDollars(amountCents);
  const participantPayload = splits.map((split) => ({
    user_id: split.userId,
    share_amount: split.shareAmount,
    share_percentage:
      split.sharePercentage == null ? "" : String(split.sharePercentage),
  }));

  const { error } = await supabase.rpc("update_expense_atomic", {
    p_expense_id: expenseId,
    p_group_id: groupId,
    p_title: title,
    p_description: description,
    p_amount: amount,
    p_paid_by: paidBy,
    p_split_type: splitType,
    p_expense_date: expenseDate,
    p_participants: participantPayload,
  });

  if (error) {
    if (error.message?.includes("update_expense_atomic") || error.code === "PGRST202") {
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          title,
          description,
          amount,
          paid_by: paidBy,
          split_type: splitType,
          expense_date: expenseDate,
        })
        .eq("id", expenseId)
        .eq("group_id", groupId);

      if (updateError) {
        return { error: updateError.message };
      }

      await supabase
        .from("expense_participants")
        .delete()
        .eq("expense_id", expenseId);

      const { error: participantError } = await supabase
        .from("expense_participants")
        .insert(
          splits.map((split) => ({
            expense_id: expenseId,
            user_id: split.userId,
            share_amount: split.shareAmount,
            share_percentage: split.sharePercentage,
          }))
        );

      if (participantError) {
        return { error: participantError.message };
      }
    } else {
      logger.error("update_expense_failed", {
        code: error.code ?? "unknown",
        groupId,
      });
      return { error: error.message };
    }
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}`);
  return { success: true };
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated." };
  }

  const supabase = await createClient();
  const membership = await requireGroupMember(supabase, groupId, user.id);
  if (!membership.ok) {
    return { error: membership.error };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", groupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function getGroupExpenses(groupId: string) {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const membership = await requireGroupMember(supabase, groupId, user.id);
  if (!membership.ok) return [];

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
  const user = await getAuthUser();
  if (!user) return null;

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
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = memberships?.map((m) => m.group_id) ?? [];
  if (groupIds.length === 0) return [];

  const [{ data: expenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, title, amount, currency, group_id, created_at, created_by, groups(name), profiles!expenses_created_by_fkey(full_name)"
      )
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("settlements")
      .select(
        "id, amount, currency, group_id, settled_at, created_by, groups(name), profiles!settlements_created_by_fkey(full_name)"
      )
      .in("group_id", groupIds)
      .order("settled_at", { ascending: false })
      .limit(limit),
  ]);

  const expenseItems =
    expenses?.map((e) => ({
      id: e.id,
      type: "expense" as const,
      title: e.title,
      amount: Number(e.amount),
      currency: e.currency,
      group_id: e.group_id,
      group_name:
        unwrapRelation(
          e.groups as { name: string } | { name: string }[] | null
        )?.name ?? "Group",
      created_at: e.created_at,
      actor_name:
        unwrapRelation(
          e.profiles as
            | { full_name: string | null }
            | { full_name: string | null }[]
            | null
        )?.full_name ?? null,
    })) ?? [];

  const settlementItems =
    settlements?.map((s) => ({
      id: s.id,
      type: "settlement" as const,
      title: "Settlement recorded",
      amount: Number(s.amount),
      currency: s.currency,
      group_id: s.group_id,
      group_name:
        unwrapRelation(
          s.groups as { name: string } | { name: string }[] | null
        )?.name ?? "Group",
      created_at: s.settled_at,
      actor_name:
        unwrapRelation(
          s.profiles as
            | { full_name: string | null }
            | { full_name: string | null }[]
            | null
        )?.full_name ?? null,
    })) ?? [];

  return [...expenseItems, ...settlementItems]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}
