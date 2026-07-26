/**
 * Pure encodings of group_members INSERT authorization after migration 003.
 * Used by malicious-client unit tests; production enforcement is Postgres RLS
 * + SECURITY DEFINER RPCs (create_group_atomic / accept_invite).
 */

export type MembershipInsertIntent = {
  actorUserId: string;
  targetUserId: string;
  role: string;
  groupCreatedBy: string;
  /** Actor is already a member of the group */
  actorIsMember: boolean;
  /** Join path claimed by client */
  via: "direct" | "invite_rpc" | "create_group_rpc";
};

/**
 * Mirrors policy "Creators can add themselves as admin" for direct inserts.
 * Invite joins and group creation membership must go through RPCs.
 */
export function canDirectInsertGroupMember(
  intent: MembershipInsertIntent
): boolean {
  if (intent.via === "invite_rpc" || intent.via === "create_group_rpc") {
    // RPCs are SECURITY DEFINER — not evaluated by this direct-insert policy.
    return true;
  }

  return (
    intent.targetUserId === intent.actorUserId &&
    intent.role === "admin" &&
    intent.groupCreatedBy === intent.actorUserId
  );
}

export function canSelfPromoteRole(options: {
  actorUserId: string;
  rowUserId: string;
  newRole: string;
}): boolean {
  // No membership UPDATE policy ships in 003 — self-promotion is denied.
  void options;
  return false;
}
