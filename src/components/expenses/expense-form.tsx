"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createExpense } from "@/actions/expenses";
import type { GroupMember, SplitType } from "@/lib/types/database";
import { toast } from "sonner";

interface ExpenseFormProps {
  groupId: string;
  members: GroupMember[];
}

export function ExpenseForm({ groupId, members }: ExpenseFormProps) {
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [paidBy, setPaidBy] = useState(members[0]?.user_id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.user_id)
  );
  const [exactValues, setExactValues] = useState<Record<string, string>>({});
  const [exactErrors, setExactErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
    setExactErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function validateExactAmounts(): boolean {
    if (splitType !== "exact") {
      setExactErrors({});
      return true;
    }

    const errors: Record<string, string> = {};
    for (const userId of selectedMembers) {
      const raw = exactValues[userId];
      if (raw == null || String(raw).trim() === "") {
        errors[userId] =
          "Enter an amount, or deselect this person. Blank is not treated as $0.";
      }
    }
    setExactErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (!validateExactAmounts()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setLoading(true);
    selectedMembers.forEach((id) => formData.append("participant_ids", id));
    formData.set("split_type", splitType);
    formData.set("paid_by", paidBy);
    formData.set(
      "client_request_id",
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );

    try {
      const result = await createExpense(groupId, formData);
      if (result?.error) {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate={splitType === "exact"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="Dinner, groceries, rent..." required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (NZD)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense_date">Date</Label>
          <Input
            id="expense_date"
            name="expense_date"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="paid_by">Paid by</Label>
          <select
            id="paid_by"
            name="paid_by"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Who paid?
            </option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profiles?.full_name ?? member.profiles?.email ?? "Member"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" name="description" rows={2} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Split type</Label>
        <div className="flex flex-wrap gap-2">
          {(["equal", "exact", "percentage"] as SplitType[]).map((type) => (
            <Button
              key={type}
              type="button"
              variant={splitType === type ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSplitType(type);
                setExactErrors({});
              }}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Participants</Label>
        <div className="space-y-2 rounded-lg border p-3">
          {members.map((member) => {
            const name =
              member.profiles?.full_name ?? member.profiles?.email ?? "Member";
            const selected = selectedMembers.includes(member.user_id);
            const exactError = exactErrors[member.user_id];
            const exactErrorId = `exact-error-${member.user_id}`;

            return (
              <div
                key={member.user_id}
                className="rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMember(member.user_id)}
                      className="rounded"
                    />
                    <span className="text-sm">{name}</span>
                  </label>

                  {selected && splitType === "exact" && (
                    <Input
                      name={`exact_${member.user_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      className="w-28"
                      value={exactValues[member.user_id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setExactValues((prev) => ({
                          ...prev,
                          [member.user_id]: value,
                        }));
                        if (exactError) {
                          setExactErrors((prev) => {
                            const next = { ...prev };
                            delete next[member.user_id];
                            return next;
                          });
                        }
                      }}
                      aria-invalid={exactError ? true : undefined}
                      aria-describedby={exactError ? exactErrorId : undefined}
                    />
                  )}

                  {selected && splitType === "percentage" && (
                    <Input
                      name={`pct_${member.user_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="%"
                      className="w-24"
                      defaultValue={(100 / Math.max(selectedMembers.length, 1)).toFixed(2)}
                      required
                    />
                  )}
                </div>
                {selected && splitType === "exact" && exactError && (
                  <p
                    id={exactErrorId}
                    role="alert"
                    className="mt-1 text-xs text-destructive"
                  >
                    {exactError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {splitType === "exact" && (
          <p className="text-xs text-brand-muted">
            Enter $0 deliberately if someone owes nothing, or deselect them.
            Blank amounts are rejected.
          </p>
        )}
      </div>

      <input type="hidden" name="currency" value="NZD" />

      <Button
        type="submit"
        disabled={loading || selectedMembers.length === 0}
        aria-busy={loading}
        className="min-h-11 w-full"
      >
        {loading ? "Saving..." : "Add expense"}
      </Button>
    </form>
  );
}
