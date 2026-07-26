"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { ensureProfile } from "@/lib/ensure-profile";
import { calculateSplits, SplitValidationError } from "@/lib/splits/calculator";
import {
  MoneyParseError,
  centsToDollars,
  parseMoneyToCents,
  parsePercentageToCentipercent,
} from "@/lib/money/cents";
import {
  assertMembersOfGroup,
  requireGroupMember,
} from "@/lib/auth/membership";
import { userFacingActionError } from "@/lib/logging/safe-error";
import type { SplitType } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

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

interface SplitRow {
  userId: string;
  shareAmount: number;
  sharePercentage: number | null;
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

function participantPayload(splits: SplitRow[]) {
  return splits.map((split) => ({
    user_id: split.userId,
    share_amount: split.shareAmount,
    share_percentage:
      split.sharePercentage == null ? "" : String(split.sharePercentage),
  }));
}

function isRpcMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    /could not find the function|create_expense_atomic|update_expense_atomic/i.test(
      error.message ?? ""
    )
  );
}

async function parseExpenseForm(
  formData: FormData,
  supabase: SupabaseClient,
  groupId: string
): Promise<
  | {
      ok: true;
      title: string;
      description: string | null;
      amount: number;
      currency: string;
      paidBy: string;
      splitType: SplitType;
      expenseDate: string;
      splits: SplitRow[];
    }
  | { ok: false; error: string }
> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "");
  const paidBy = String(formData.get("paid_by") ?? "");
  const splitType = String(formData.get("split_type") ?? "equal") as SplitType;
  const expenseDate = String(formData.get("expense_date") ?? "");
  const currency = String(formData.get("currency") ?? "NZD");
  const participantIds = Array.from(
    new Set(formData.getAll("participant_ids").map(String).filter(Boolean))
  );

  if (!title) return { ok: false, error: "Title is required." };
  if (!paidBy) return { ok: false, error: "Select who paid." };
  if (!["equal", "exact", "percentage"].includes(splitType)) {
    return { ok: false, error: "Invalid split type." };
  }
  if (participantIds.length === 0) {
    return { ok: false, error: "Select at least one participant." };
  }

  let amountCents: number;
  try {
    amountCents = parseMoneyToCents(amountRaw);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof MoneyParseError ? err.message : "Enter a valid amount.",
    };
  }

  if (amountCents <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  const memberCheck = await assertMembersOfGroup(supabase, groupId, [
    paidBy,
    ...participantIds,
  ]);
  if (!memberCheck.ok) {
    return { ok: false, error: memberCheck.error };
  }

  let participants: ParticipantInput[];
  try {
    participants = parseParticipants(formData, splitType, participantIds);
  } catch (err) {
    if (err instanceof SplitValidationError || err instanceof MoneyParseError) {
      return { ok: false, error: err.message };
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
      return { ok: false, error: err.message };
    }
    throw err;
  }

  return {
    ok: true,
    title,
    description,
    amount: centsToDollars(amountCents),
    currency,
    paidBy,
    splitType,
    expenseDate: expenseDate || new Date().toISOString().split("T")[0],
    splits,
  };
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

  const parsed = await parseExpenseForm(formData, supabase, groupId);
  if (!parsed.ok) return { error: parsed.error };

  const { data: expenseId, error } = await supabase.rpc("create_expense_atomic", {
    p_group_id: groupId,
    p_paid_by: parsed.paidBy,
    p_created_by: user.id,
    p_title: parsed.title,
    p_description: parsed.description,
    p_amount: parsed.amount,
    p_currency: parsed.currency,
    p_split_type: parsed.splitType,
    p_expense_date: parsed.expenseDate,
    p_participants: participantPayload(parsed.splits),
  });

  if (!error && expenseId) {
    revalidatePath(`/groups/${groupId}`);
    redirect(`/groups/${groupId}`);
  }

  if (error && !isRpcMissing(error)) {
    const { userMessage } = userFacingActionError(
      "create_expense_failed",
      error,
      "Could not create expense."
    );
    return { error: userMessage };
  }

  // Pre-migration fallback — best-effort compensating delete (not fully atomic).
  return createExpenseLegacy(supabase, {
    groupId,
    userId: user.id,
    ...parsed,
  });
}

async function createExpenseLegacy(
  supabase: SupabaseClient,
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
    splits: SplitRow[];
  }
) {
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
      expense_date: args.expenseDate,
    })
    .select("id")
    .single();

  if (error || !expense) {
    const { userMessage } = userFacingActionError(
      "create_expense_legacy_failed",
      error,
      "Could not create expense."
    );
    return { error: userMessage };
  }

  const { error: participantError } = await supabase
    .from("expense_participants")
    .insert(
      args.splits.map((split) => ({
        expense_id: expense.id,
        user_id: split.userId,
        share_amount: split.shareAmount,
        share_percentage: split.sharePercentage,
      }))
    );

  if (participantError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    const { userMessage } = userFacingActionError(
      "create_expense_participants_failed",
      participantError,
      "Could not create expense."
    );
    return { error: userMessage };
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

  const parsed = await parseExpenseForm(formData, supabase, groupId);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase.rpc("update_expense_atomic", {
    p_expense_id: expenseId,
    p_group_id: groupId,
    p_paid_by: parsed.paidBy,
    p_title: parsed.title,
    p_description: parsed.description,
    p_amount: parsed.amount,
    p_split_type: parsed.splitType,
    p_expense_date: parsed.expenseDate,
    p_participants: participantPayload(parsed.splits),
  });

  if (!error) {
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/expenses/${expenseId}`);
    return { success: true };
  }

  if (!isRpcMissing(error)) {
    const { userMessage } = userFacingActionError(
      "update_expense_failed",
      error,
      "Could not update expense."
    );
    return { error: userMessage };
  }

  // Pre-migration: non-atomic — prefer RPC in production.
  const { error: updateError } = await supabase
    .from("expenses")
    .update({
      title: parsed.title,
      description: parsed.description,
      amount: parsed.amount,
      paid_by: parsed.paidBy,
      split_type: parsed.splitType,
      expense_date: parsed.expenseDate,
    })
    .eq("id", expenseId);

  if (updateError) {
    const { userMessage } = userFacingActionError(
      "update_expense_legacy_failed",
      updateError,
      "Could not update expense."
    );
    return { error: userMessage };
  }

  await supabase.from("expense_participants").delete().eq("expense_id", expenseId);

  const { error: participantError } = await supabase
    .from("expense_participants")
    .insert(
      parsed.splits.map((split) => ({
        expense_id: expenseId,
        user_id: split.userId,
        share_amount: split.shareAmount,
        share_percentage: split.sharePercentage,
      }))
    );

  if (participantError) {
    const { userMessage } = userFacingActionError(
      "update_expense_participants_failed",
      participantError,
      "Could not update expense splits. Please retry."
    );
    return { error: userMessage };
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

  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

  if (error) {
    const { userMessage } = userFacingActionError(
      "delete_expense_failed",
      error,
      "Could not delete expense."
    );
    return { error: userMessage };
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
        unwrapRelation(e.groups as { name: string } | { name: string }[] | null)
          ?.name ?? "Group",
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
        unwrapRelation(s.groups as { name: string } | { name: string }[] | null)
          ?.name ?? "Group",
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
