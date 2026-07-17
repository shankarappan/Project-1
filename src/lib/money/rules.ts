/**
 * Documented financial business rules for Lets Split.
 *
 * Ambiguous rules that need a product decision are marked NEEDS_DECISION.
 * Implemented defaults below preserve prior app behavior where possible.
 */

export const MONEY_BUSINESS_RULES = {
  /**
   * Equal split: each share is floor(total/n) cents; the remainder
   * (total - floor*n) is assigned to the LAST participant in the submitted order.
   * Preserves existing calculator behavior.
   */
  equalRemainderAssignee: "last_participant" as const,

  /**
   * Exact split: every selected participant must provide a non-blank, non-negative
   * amount; shares must sum exactly to the expense total in cents.
   * Blank is rejected (not treated as zero) so silent under-allocation cannot happen.
   */
  exactBlankAmount: "reject" as const,

  /**
   * Percentage split: percentages must sum to exactly 100.00% (10000 centipercent).
   * Monetary shares are computed in cents; remainder cents go to the last participant.
   */
  percentageTotal: "exactly_100" as const,

  /**
   * Settlement overpayment: reject when the settlement amount exceeds the payer's
   * current net debt to the group (how much they owe overall).
   *
   * NEEDS_DECISION: pairwise caps (cannot pay one person more than they are owed)
   * are not enforced because the ledger is net-based, not pairwise.
   */
  settlementOverpayment: "reject_vs_payer_net_debt" as const,

  /**
   * Concurrent writes: expense create/update/delete and settlement writes that
   * touch multiple rows use a Postgres function (single transaction).
   * Duplicate form posts use client_request_id uniqueness for idempotency.
   * Concurrent independent inserts are safe because balances are derived from the ledger.
   */
  concurrency: "transactional_rpc_plus_idempotency" as const,

  /**
   * Owner-only actions: create invites and update group settings require
   * group role admin (creator is seeded as admin) or being groups.created_by.
   */
  ownerActions: "admin_or_creator" as const,
} as const;
