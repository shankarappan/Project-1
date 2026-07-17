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

  const ledgerCents = buildBalanceLedgerCents(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );
  const maxCents = maxSettlementCentsForPayer(ledgerCents, payerId);

  if (amountCents > maxCents) {
    return {
      error:
        maxCents === 0
          ? "This payer does not currently owe the group, so a settlement cannot be recorded."
          : `Settlement cannot exceed what the payer currently owes (${centsToDollars(maxCents).toFixed(2)}).`,
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
  };

  let { error } = await supabase.from("settlements").insert({
    ...baseRow,
    ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
  });

  // Remote DB may not have migration 003 yet
  if (error && clientRequestId && /client_request_id|column/i.test(error.message)) {
    ({ error } = await supabase.from("settlements").insert(baseRow));
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

  const ledgerCents = buildBalanceLedgerCents(
    (expenses as Expense[]) ?? [],
    (settlements as Settlement[]) ?? []
  );
  const maxCents = maxSettlementCentsForPayer(ledgerCents, payerId);

  if (amountCents > maxCents) {
    return {
      error: `Settlement cannot exceed what the payer currently owes (${centsToDollars(maxCents).toFixed(2)}).`,
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

export async function deleteSettlement(settlementId: string, groupId: string) {
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
    .from("settlements")
    .delete()
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
