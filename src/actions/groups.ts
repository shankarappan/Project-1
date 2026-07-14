"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { ensureProfile } from "@/lib/ensure-profile";
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

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (error || !group) {
    throw new Error(error?.message ?? "Failed to create group.");
  }

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) {
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
    .select("group_id, groups(id, name, created_at, created_by)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return (
    memberships
      ?.map((m) => {
        const group = m.groups;
        if (Array.isArray(group)) return group[0];
        return group;
      })
      .filter((g): g is { id: string; name: string; created_at: string; created_by: string } => g != null) ?? []
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

  const supabase = await createClient();

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
    return { error: error?.message ?? "Failed to create invite." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${data.invite_token}`;

  return { success: true, inviteUrl };
}

export async function acceptInvite(token: string) {
  const user = await getAuthUser();

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from("invites")
    .select("*")
    .eq("invite_token", token)
    .is("accepted_by", null)
    .single();

  if (error || !invite) {
    return { error: "Invite not found or already used." };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "This invite has expired." };
  }

  const { error: memberError } = await supabase.from("group_members").upsert(
    {
      group_id: invite.group_id,
      user_id: user!.id,
      role: "member",
    },
    { onConflict: "group_id,user_id" }
  );

  if (memberError) {
    return { error: memberError.message };
  }

  await supabase
    .from("invites")
    .update({ accepted_by: user!.id })
    .eq("id", invite.id);

  revalidatePath(`/groups/${invite.group_id}`);
  redirect(`/groups/${invite.group_id}`);
}
