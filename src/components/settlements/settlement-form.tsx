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
import { createSettlement } from "@/actions/balances";
import type { GroupMember } from "@/lib/types/database";
import { toast } from "sonner";

interface SettlementFormProps {
  groupId: string;
  members: GroupMember[];
}

export function SettlementForm({ groupId, members }: SettlementFormProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await createSettlement(groupId, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Settlement recorded");
    (document.getElementById("settlement-form") as HTMLFormElement)?.reset();
  }

  return (
    <form id="settlement-form" action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payer_id">Who paid?</Label>
          <Select name="payer_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Select payer" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name ?? member.profiles?.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiver_id">Who received?</Label>
          <Select name="receiver_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Select receiver" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name ?? member.profiles?.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (NZD)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" name="note" rows={2} placeholder="Cash, bank transfer..." />
        </div>
      </div>

      <input type="hidden" name="currency" value="NZD" />

      <Button type="submit" disabled={loading}>
        {loading ? "Recording..." : "Record settlement"}
      </Button>
    </form>
  );
}
