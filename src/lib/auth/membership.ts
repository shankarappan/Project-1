import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<{ ok: true; role: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Unable to verify group membership." };
  }

  if (!data) {
    return { ok: false, error: "You are not a member of this group." };
  }

  return { ok: true, role: data.role };
}

/**
 * Pure authorization check for owner/admin actions (invites, etc.).
 * Enforced server-side — hiding UI is not sufficient.
 */
export function canPerformOwnerAction(options: {
  role: string | null | undefined;
  userId: string;
  groupCreatedBy: string | null | undefined;
}): boolean {
  if (options.role === "admin") return true;
  if (options.groupCreatedBy && options.groupCreatedBy === options.userId) {
    return true;
  }
  return false;
}

export async function requireGroupAdmin(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await requireGroupMember(supabase, groupId, userId);
  if (!membership.ok) return membership;

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (
    canPerformOwnerAction({
      role: membership.role,
      userId,
      groupCreatedBy: group?.created_by,
    })
  ) {
    return { ok: true };
  }

  return { ok: false, error: "Only group admins can perform this action." };
}

export async function assertMembersOfGroup(
  supabase: SupabaseClient,
  groupId: string,
  userIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) {
    return { ok: false, error: "Select at least one participant." };
  }

  const { data, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .in("user_id", unique);

  if (error) {
    return { ok: false, error: "Unable to verify group membership." };
  }

  const found = new Set((data ?? []).map((row) => row.user_id));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      error: "Payer and participants must be members of this group.",
    };
  }

  return { ok: true };
}
