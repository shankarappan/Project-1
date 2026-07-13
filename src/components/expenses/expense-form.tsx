"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpense } from "@/actions/expenses";
import type { GroupMember, SplitType } from "@/lib/types/database";
import { toast } from "sonner";

interface ExpenseFormProps {
  groupId: string;
  members: GroupMember[];
}

export function ExpenseForm({ groupId, members }: ExpenseFormProps) {
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.user_id)
  );
  const [loading, setLoading] = useState(false);

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    selectedMembers.forEach((id) => formData.append("participant_ids", id));
    formData.set("split_type", splitType);

    const result = await createExpense(groupId, formData);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
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
          <Select name="paid_by" required>
            <SelectTrigger>
              <SelectValue placeholder="Who paid?" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name ?? member.profiles?.email ?? "Member"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              onClick={() => setSplitType(type)}
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
                    defaultValue={splitType === "percentage" ? (100 / members.length).toFixed(2) : undefined}
                    required
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="currency" value="NZD" />

      <Button type="submit" disabled={loading || selectedMembers.length === 0} className="w-full">
        {loading ? "Saving..." : "Add expense"}
      </Button>
    </form>
  );
}
