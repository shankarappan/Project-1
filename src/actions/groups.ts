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
import {
  isRpcMissing,
  MIGRATION_REQUIRED_MESSAGE,
} from "@/lib/service";
import { randomBytes } from "crypto";

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

  // Database-backed idempotency only (unique index + RPC). Fail closed if
  // migration 003 is missing — no non-idempotent legacy insert path.
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

  if (isRpcMissing(rpcError)) {
    throw new Error(MIGRATION_REQUIRED_MESSAGE);
  }

  const { userMessage } = userFacingActionError(
    "create_group_failed",
    rpcError,
    "Could not create group."
  );
  throw new Error(userMessage);
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

  if (isRpcMissing(error)) {
    return { error: MIGRATION_REQUIRED_MESSAGE };
  }

  return { error: mapAcceptInviteError(error?.message ?? "") };
}
