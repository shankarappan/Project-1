"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Loader2 } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const equalPercentageDefault = useMemo(() => {
    if (selectedMembers.length === 0) return "0";
    return (100 / selectedMembers.length).toFixed(2);
  }, [selectedMembers.length]);

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function handleSubmit(formData: FormData) {
    if (submittingRef.current || pending) return;
    submittingRef.current = true;
    setError(null);

    selectedMembers.forEach((id) => formData.append("participant_ids", id));
    formData.set("split_type", splitType);
    formData.set("paid_by", paidBy);

    startTransition(async () => {
      try {
        const result = await createExpense(groupId, formData);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
        }
      } catch (err) {
        if (isRedirectError(err)) throw err;
        const message =
          err instanceof Error ? err.message : "Failed to create expense.";
        setError(message);
        toast.error(message);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-6"
      aria-busy={pending}
      onSubmit={(event) => {
        if (submittingRef.current || pending) {
          event.preventDefault();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Dinner, groceries, rent..."
            required
            disabled={pending}
          />
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
            disabled={pending}
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
            disabled={pending}
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
            disabled={pending}
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
          <Textarea id="description" name="description" rows={2} disabled={pending} />
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
              onClick={() => setSplitType(type)}
              disabled={pending}
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

            return (
              <div
                key={member.user_id}
                className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleMember(member.user_id)}
                    className="rounded"
                    disabled={pending}
                  />
                  <span className="text-sm">{name}</span>
                </label>

                {selected && splitType === "exact" && (
                  <Input
                    name={`exact_${member.user_id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-28"
                    required
                    disabled={pending}
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
                    defaultValue={equalPercentageDefault}
                    required
                    disabled={pending}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="currency" value="NZD" />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {pending ? "Saving expense, please wait." : ""}
      </p>

      <Button
        type="submit"
        disabled={pending || selectedMembers.length === 0}
        className="w-full"
        aria-disabled={pending || selectedMembers.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Add expense"
        )}
      </Button>
    </form>
  );
}
