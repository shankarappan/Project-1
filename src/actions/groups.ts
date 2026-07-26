"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { ensureProfile } from "@/lib/ensure-profile";
import {
  canPerformOwnerAction,
  requireGroupAdmin,
} from "@/lib/auth/membership";
import { userFacingActionError } from "@/lib/logging/safe-error";
import { randomBytes } from "crypto";

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "23505" || /duplicate key|unique constraint/i.test(error.message ?? "");
}

export async function createGroup(formData: FormData): Promise<void> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  await ensureProfile(user);
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Group name is required.");
  }

  const clientRequestId =
    String(formData.get("client_request_id") ?? "").trim() || null;

  // Idempotency is database-backed only (unique index + RPC). Vercel has
  // multiple ephemeral instances — never rely on process memory for exactly-once.
  // Prefer atomic RPC (migration 003). Fall back for environments not yet migrated.
  const { data: rpcGroupId, error: rpcError } = await supabase.rpc(
    "create_group_atomic",
    {
      p_name: name,
      p_created_by: user.id,
      p_client_request_id: clientRequestId,
    }
  );

  if (!rpcError && rpcGroupId) {
    revalidatePath("/dashboard");
    redirect(`/groups/${rpcGroupId}`);
  }

  const rpcMissing =
    rpcError?.code === "PGRST202" ||
    /create_group_atomic|could not find the function/i.test(rpcError?.message ?? "");

  if (rpcError && !rpcMissing) {
    throw new Error(rpcError.message);
  }

  if (clientRequestId) {
    const { data: existing } = await supabase
      .from("groups")
      .select("id")
      .eq("created_by", user.id)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();

    if (existing?.id) {
      revalidatePath("/dashboard");
      redirect(`/groups/${existing.id}`);
    }
  }

  let { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      created_by: user.id,
      ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
    })
    .select("id")
    .single();

  // Pre-migration environments may not have client_request_id yet.
  if (
    error &&
    clientRequestId &&
    /client_request_id/i.test(error.message ?? "")
  ) {
    ({ data: group, error } = await supabase
      .from("groups")
      .insert({ name, created_by: user.id })
      .select("id")
      .single());
  }

  if (error || !group) {
    if (clientRequestId && isUniqueViolation(error)) {
      const { data: existing } = await supabase
        .from("groups")
        .select("id")
        .eq("created_by", user.id)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();

      if (existing?.id) {
        revalidatePath("/dashboard");
        redirect(`/groups/${existing.id}`);
      }
    }
    throw new Error(error?.message ?? "Failed to create group.");
  }

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError && !isUniqueViolation(memberError)) {
    throw new Error(memberError.message);
  }

  revalidatePath("/dashboard");
  redirect(`/groups/${group.id}`);
}

export async function getUserGroups() {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("group_members")
    .select("role, group_id, groups(id, name, created_at, created_by)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return (
    memberships
      ?.map((m) => {
        const group = m.groups;
        const resolved = Array.isArray(group) ? group[0] : group;
        if (!resolved) return null;
        return {
          id: resolved.id,
          name: resolved.name,
          created_at: resolved.created_at,
          created_by: resolved.created_by,
          role: m.role as string,
          canInvite: canPerformOwnerAction({
            role: m.role as string,
            userId: user.id,
            groupCreatedBy: resolved.created_by,
          }),
        };
      })
      .filter(
        (
          g
        ): g is {
          id: string;
          name: string;
          created_at: string;
          created_by: string;
          role: string;
          canInvite: boolean;
        } => g != null
      ) ?? []
  );
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();

  const { data: group, error } = await supabase
    .from("groups")
    .select(
      `
      *,
      group_members (
        id,
        user_id,
        role,
        joined_at,
        profiles (id, email, full_name, avatar_url)
      )
    `
    )
    .eq("id", groupId)
    .single();

  if (error || !group) return null;
  return group;
}

export async function createInvite(groupId: string, email?: string) {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated." };
  }

  await ensureProfile(user);
  const supabase = await createClient();

  const admin = await requireGroupAdmin(supabase, groupId, user.id);
  if (!admin.ok) {
    return { error: admin.error };
  }

  const inviteToken = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("invites")
    .insert({
      group_id: groupId,
      email: email?.trim() || null,
      invite_token: inviteToken,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("invite_token")
    .single();

  if (error || !data) {
    const { userMessage } = userFacingActionError(
      "create_invite_failed",
      error,
      "Could not create invite. Please try again."
    );
    return { error: userMessage };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${data.invite_token}`;

  return { success: true, inviteUrl };
}

function mapAcceptInviteError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) {
    return "This invite has expired.";
  }
  if (lower.includes("email mismatch")) {
    return "This invite is for a different email address. Sign in with that email to join.";
  }
  if (lower.includes("not authenticated")) {
    return "Sign in to accept this invite.";
  }
  if (
    lower.includes("not found") ||
    lower.includes("already used") ||
    lower.includes("invite")
  ) {
    return "Invite not found, expired, or already used.";
  }
  return "Could not accept invite. Please try again.";
}

export async function acceptInvite(token: string) {
  const user = await getAuthUser();

  if (!user) {
    redirect(`/login?redirect=/invite/${encodeURIComponent(token)}`);
  }

  await ensureProfile(user!);
  const supabase = await createClient();

  const { data: groupId, error } = await supabase.rpc("accept_invite", {
    p_token: token,
  });

  if (!error && groupId) {
    revalidatePath(`/groups/${groupId}`);
    redirect(`/groups/${groupId}`);
  }

  const rpcMissing =
    error?.code === "PGRST202" ||
    /accept_invite|could not find the function/i.test(error?.message ?? "");

  if (error && !rpcMissing) {
    return { error: mapAcceptInviteError(error.message) };
  }

  // Pre-migration fallback only. After 003, direct membership insert is denied
  // for non-creators — deploy migration before relying on invites in production.
  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("*")
    .eq("invite_token", token)
    .is("accepted_by", null)
    .maybeSingle();

  if (inviteError || !invite) {
    return { error: "Invite not found, expired, or already used." };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "This invite has expired." };
  }

  if (invite.email) {
    const signedInEmail = user!.email?.toLowerCase();
    if (!signedInEmail || signedInEmail !== invite.email.toLowerCase()) {
      return {
        error:
          "This invite is for a different email address. Sign in with that email to join.",
      };
    }
  }

  return {
    error:
      "Invite acceptance requires database migration 003 (accept_invite). Ask an admin to apply it.",
  };
}
