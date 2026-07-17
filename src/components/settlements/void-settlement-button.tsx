"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { voidSettlement } from "@/actions/balances";
import { toast } from "sonner";

interface VoidSettlementButtonProps {
  settlementId: string;
  groupId: string;
  label: string;
}

export function VoidSettlementButton({
  settlementId,
  groupId,
  label,
}: VoidSettlementButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleVoid() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await voidSettlement(
        settlementId,
        groupId,
        "Voided by member"
      );
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Settlement voided");
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm void">
        <p className="text-xs text-brand-muted">
          Void this settlement? It stays in history but no longer affects balances.
        </p>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="min-h-11"
          disabled={pending}
          aria-busy={pending}
          onClick={handleVoid}
        >
          {pending ? "Voiding..." : "Confirm void"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="min-h-11 text-destructive hover:text-destructive"
      onClick={handleVoid}
      aria-label={`Void settlement: ${label}`}
    >
      Void
    </Button>
  );
}
