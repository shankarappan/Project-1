import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/003_reliability.sql"),
  "utf8"
);

describe("migration 003 expense RPC invariants (static)", () => {
  it("defines assert helper used by both create and update RPCs", () => {
    expect(sql).toMatch(/create or replace function public\.assert_expense_split_payload/i);
    expect(sql).toMatch(
      /perform public\.assert_expense_split_payload\([\s\S]*p_participants/i
    );
    const performCount = (
      sql.match(/perform public\.assert_expense_split_payload/gi) ?? []
    ).length;
    expect(performCount).toBeGreaterThanOrEqual(2);
  });

  it("rejects malicious payloads via explicit exception messages", () => {
    const required = [
      "Invalid split type",
      "Title is required",
      "Amount must be greater than zero",
      "Amount must use at most 2 decimal places",
      "Select at least one participant",
      "Duplicate participants",
      "Share amount cannot be negative",
      "Share amount must use at most 2 decimal places",
      "Share amounts must equal expense amount",
      "Percentages must total 100",
      "Percentage cannot be negative",
      "Percentage must use at most 2 decimal places",
      "Equal split shares are inconsistent",
      "Percentage shares do not match policy",
      "Payer and participants must be members of this group",
    ];
    for (const message of required) {
      expect(sql).toContain(message);
    }
  });

  it("keeps assert_expense_split_payload internal (no client EXECUTE)", () => {
    expect(sql).toMatch(
      /revoke all on function public\.assert_expense_split_payload\([\s\S]*?\) from public;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.assert_expense_split_payload\([\s\S]*?\) from authenticated;/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.assert_expense_split_payload\([\s\S]*?\) to authenticated;/i
    );
  });

  it("enforces deterministic remainder assignment by sorted user_id", () => {
    expect(sql).toMatch(
      /from jsonb_array_elements\(p_participants\) e\s+order by \(e->>'user_id'\)/i
    );
    expect(sql).toMatch(
      /v_expected := v_base \+ case when v_idx <= v_rem then 1 else 0 end/i
    );
    expect(sql).toMatch(
      /v_expected := v_base \+ case when v_idx <= v_leftover then 1 else 0 end/i
    );
    expect(sql).toMatch(
      /\(v_amount_cents \* v_centipercent\) \/ 10000/i
    );
  });

  it("documents migration-first rollout (app fails closed without RPCs)", () => {
    expect(sql).toMatch(/MIGRATION FIRST/i);
    expect(sql).toMatch(/create_expense_atomic/i);
    expect(sql).toMatch(/update_expense_atomic/i);
    expect(sql).toMatch(/accept_invite/i);
    expect(sql).toMatch(/create_group_atomic/i);
  });
});

