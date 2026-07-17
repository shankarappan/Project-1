/**
 * Documented financial business rules for Lets Split.
 */

export const MONEY_BUSINESS_RULES = {
  /**
   * Equal split: floor(total/n) cents each, then distribute remaining cents
   * one-at-a-time through participant IDs sorted lexicographically.
   * Independent of UI / form order.
   */
  equalRemainderAssignee: "sorted_participant_id_round_robin" as const,

  /**
   * Exact split: every selected participant must provide a non-blank, non-negative
   * amount; shares must sum exactly to the expense total in cents.
   * Blank is rejected (not treated as zero). Deliberate $0 must be entered as 0,
   * or the participant should be deselected.
   */
  exactBlankAmount: "reject" as const,

  /**
   * Percentage split: percentages must sum to exactly 100.00% (10000 centipercent).
   * Floor each share in cents, then distribute leftover cents by sorted participant ID.
   */
  percentageTotal: "exactly_100" as const,

  /**
   * Settlement overpayment: reject when amount exceeds the payer’s current net
   * group debt. Message: "You only owe $X in this group."
   * No pairwise caps (simplified balances can reshuffle pairings).
   * Partial settlements allowed up to net debt. Zero/negative/duplicates rejected.
   */
  settlementOverpayment: "reject_vs_payer_net_debt" as const,

  /**
   * Settlements are voided (soft), not hard-deleted, preserving audit history.
   * Edits are delete-and-recreate (void + new record) for MVP.
   */
  settlementLifecycle: "void_not_hard_delete" as const,

  /**
   * Concurrent writes: expense create/update use transactional RPCs where available.
   * Duplicate form posts use client_request_id uniqueness for idempotency.
   */
  concurrency: "transactional_rpc_plus_idempotency" as const,

  /**
   * Invites: creator/admin only, enforced server-side.
   */
  ownerActions: "admin_or_creator" as const,
} as const;
