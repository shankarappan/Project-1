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

export async function requireGroupAdmin(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await requireGroupMember(supabase, groupId, userId);
  if (!membership.ok) return membership;

  if (membership.role === "admin") {
    return { ok: true };
  }

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (group?.created_by === userId) {
    return { ok: true };
  }

  return { ok: false, error: "Only group admins can perform this action." };
}
