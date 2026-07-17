"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { ensureProfile } from "@/lib/ensure-profile";
import {
  assertLedgerConserved,
  buildBalanceLedger,
  buildBalanceLedgerCents,
  maxSettlementCentsForPayer,
  summarizeBalancesFromCents,
  summarizeForUser,
  summarizeForUserCents,
} from "@/lib/balance/engine";
import {
  MoneyParseError,
  centsToDollars,
  parseMoneyToCents,
} from "@/lib/money/cents";
import { requireGroupMember } from "@/lib/auth/membership";
import { logger } from "@/lib/logging/logger";
import type { Expense, Profile, Settlement } from "@/lib/types/database";

export async function getGroupBalances(groupId: string) {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const membership = await requireGroupMember(supabase, groupId, user.id);
  if (!membership.ok) return [];

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

  const ledgerCents = buildBalanceLedgerCents(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );

  try {
    assertLedgerConserved(ledgerCents);
  } catch (err) {
    logger.error("ledger_not_conserved", {
      groupId,
      reason: err instanceof Error ? err.message : "unknown",
    });
  }

  return summarizeBalancesFromCents(ledgerCents, profiles);
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

  const [{ data: expenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, expense_participants (id, user_id, share_amount)`)
      .in("group_id", groupIds),
    supabase.from("settlements").select("*").in("group_id", groupIds),
  ]);

  const ledgerCents = buildBalanceLedgerCents(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );

  return summarizeForUserCents(ledgerCents, user.id);
}

export async function createSettlement(groupId: string, formData: FormData) {
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

  const payerId = String(formData.get("payer_id") ?? "");
  const receiverId = String(formData.get("receiver_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "NZD");
  const clientRequestId =
    String(formData.get("client_request_id") ?? "").trim() || null;

  if (!payerId || !receiverId) {
    return { error: "Select both payer and receiver." };
  }

  if (payerId === receiverId) {
    return { error: "Payer and receiver must be different people." };
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
    return { error: "Enter a valid amount." };
  }

  const [{ data: expenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, expense_participants (id, user_id, share_amount)`)
      .eq("group_id", groupId),
    supabase.from("settlements").select("*").eq("group_id", groupId),
  ]);

  const activeSettlements = ((settlements as Settlement[]) ?? []).filter(
    (s) => s.status !== "voided"
  );

  const ledgerCents = buildBalanceLedgerCents(
    (expenses as Expense[]) ?? [],
    activeSettlements
  );
  const maxCents = maxSettlementCentsForPayer(ledgerCents, payerId);

  if (amountCents > maxCents) {
    const owed = centsToDollars(maxCents).toFixed(2);
    return {
      error:
        maxCents === 0
          ? "You only owe $0.00 in this group."
          : `You only owe $${owed} in this group.`,
    };
  }

  if (clientRequestId) {
    const { data: existing, error: existingError } = await supabase
      .from("settlements")
      .select("id")
      .eq("created_by", user.id)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();

    if (!existingError && existing) {
      revalidatePath(`/groups/${groupId}`);
      revalidatePath(`/groups/${groupId}/settlements`);
      revalidatePath("/dashboard");
      return { success: true, idempotent: true };
    }
  }

  const amount = centsToDollars(amountCents);
  const baseRow = {
    group_id: groupId,
    payer_id: payerId,
    receiver_id: receiverId,
    amount,
    currency,
    note,
    created_by: user.id,
    status: "active" as const,
  };

  let { error } = await supabase.from("settlements").insert({
    ...baseRow,
    ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
  });

  // Remote DB may not have migration 003/004 yet
  if (error && /client_request_id|status|column/i.test(error.message)) {
    const legacyRow = {
      group_id: groupId,
      payer_id: payerId,
      receiver_id: receiverId,
      amount,
      currency,
      note,
      created_by: user.id,
    };
    const retry = await supabase.from("settlements").insert(legacyRow);
    error = retry.error;
  }

  if (error) {
    if (error.code === "23505" && clientRequestId) {
      return { success: true, idempotent: true };
    }
    logger.error("create_settlement_failed", {
      code: error.code ?? "unknown",
      groupId,
    });
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settlements`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * MVP edits are void + recreate. Direct field updates remain available for
 * internal/tests but UI uses voidSettlement.
 */
export async function updateSettlement(
  settlementId: string,
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

  const payerId = String(formData.get("payer_id") ?? "");
  const receiverId = String(formData.get("receiver_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!payerId || !receiverId) {
    return { error: "Select both payer and receiver." };
  }
  if (payerId === receiverId) {
    return { error: "Payer and receiver must be different people." };
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
    return { error: "Enter a valid amount." };
  }

  const [{ data: expenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, expense_participants (id, user_id, share_amount)`)
      .eq("group_id", groupId),
    supabase
      .from("settlements")
      .select("*")
      .eq("group_id", groupId)
      .neq("id", settlementId),
  ]);

  const activeSettlements = ((settlements as Settlement[]) ?? []).filter(
    (s) => s.status !== "voided"
  );

  const ledgerCents = buildBalanceLedgerCents(
    (expenses as Expense[]) ?? [],
    activeSettlements
  );
  const maxCents = maxSettlementCentsForPayer(ledgerCents, payerId);

  if (amountCents > maxCents) {
    const owed = centsToDollars(maxCents).toFixed(2);
    return {
      error:
        maxCents === 0
          ? "You only owe $0.00 in this group."
          : `You only owe $${owed} in this group.`,
    };
  }

  const { error } = await supabase
    .from("settlements")
    .update({
      payer_id: payerId,
      receiver_id: receiverId,
      amount: centsToDollars(amountCents),
      note,
    })
    .eq("id", settlementId)
    .eq("group_id", groupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settlements`);
  revalidatePath("/dashboard");
  return { success: true };
}

/** Soft-void a settlement; preserves the row for audit history. */
export async function voidSettlement(
  settlementId: string,
  groupId: string,
  reason?: string
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

  const voidPayload = {
    status: "voided" as const,
    voided_at: new Date().toISOString(),
    voided_by: user.id,
    void_reason: reason?.trim() || "Voided by member",
  };

  let { error } = await supabase
    .from("settlements")
    .update(voidPayload)
    .eq("id", settlementId)
    .eq("group_id", groupId)
    .neq("status", "voided");

  // Fallback when status column is not migrated yet: hard-delete as last resort
  // with an audit log note (should only happen pre-migration-004).
  if (error && /status|column|voided/i.test(error.message)) {
    logger.warn("void_settlement_fallback_delete", {
      groupId,
      reason: "status_column_missing",
    });
    ({ error } = await supabase
      .from("settlements")
      .delete()
      .eq("id", settlementId)
      .eq("group_id", groupId));
  }

  if (error) {
    logger.error("void_settlement_failed", {
      code: error.code ?? "unknown",
      groupId,
    });
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settlements`);
  revalidatePath("/dashboard");
  return { success: true };
}

/** @deprecated Prefer voidSettlement — hard delete is not used by the UI. */
export async function deleteSettlement(settlementId: string, groupId: string) {
  return voidSettlement(settlementId, groupId, "Deleted (legacy path)");
}

export async function getGroupSettlements(groupId: string) {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const membership = await requireGroupMember(supabase, groupId, user.id);
  if (!membership.ok) return [];

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

/** Exported for tests that exercise dollar ledger helpers. */
export async function getGroupLedgerForTests(groupId: string) {
  const supabase = await createClient();
  const [{ data: expenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, expense_participants (id, user_id, share_amount)`)
      .eq("group_id", groupId),
    supabase.from("settlements").select("*").eq("group_id", groupId),
  ]);
  return buildBalanceLedger(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );
}

export { summarizeForUser };
