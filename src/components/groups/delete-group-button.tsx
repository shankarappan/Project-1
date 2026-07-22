"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Button } from "@/components/ui/button";
import { deleteGroup } from "@/actions/groups";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteGroupButtonProps {
  groupId: string;
  groupName: string;
  /** Compact icon control for list rows */
  variant?: "button" | "icon";
}

export function DeleteGroupButton({
  groupId,
  groupName,
  variant = "button",
}: DeleteGroupButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete(event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteGroup(groupId);
        if (result?.error) {
          toast.error(result.error);
          setConfirming(false);
        }
      } catch (err) {
        if (isRedirectError(err)) throw err;
        toast.error("Could not delete this group. Please try again.");
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div
        className={
          variant === "icon"
            ? "flex flex-col items-end gap-2"
            : "flex flex-wrap items-center gap-2"
        }
        role="group"
        aria-label={`Confirm delete ${groupName}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <p className="max-w-[14rem] text-right text-xs text-brand-muted">
          Delete “{groupName}”? Expenses and settlements in this group will be
          removed.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="min-h-11"
            disabled={pending}
            aria-busy={pending}
            onClick={handleDelete}
          >
            {pending ? "Deleting..." : "Confirm delete"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setConfirming(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDelete}
        aria-label={`Delete group ${groupName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="min-h-11 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      aria-label={`Delete group ${groupName}`}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete group
    </Button>
  );
}
