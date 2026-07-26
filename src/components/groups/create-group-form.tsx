"use client";

import { useId, useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createGroup } from "@/actions/groups";

function newRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CreateGroupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const requestIdRef = useRef(newRequestId());
  const formId = useId();
  const errorId = `${formId}-error`;
  const pendingId = `${formId}-pending`;

  function handleSubmit(formData: FormData) {
    if (submittingRef.current || pending) return;
    submittingRef.current = true;
    setError(null);
    formData.set("client_request_id", requestIdRef.current);

    startTransition(async () => {
      try {
        await createGroup(formData);
        // redirect() throws; if we return, mint a fresh key for a later retry.
        requestIdRef.current = newRequestId();
      } catch (err) {
        if (isRedirectError(err)) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Failed to create group.");
        // Keep the same idempotency key so a retry after a network blip is safe.
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4"
      aria-busy={pending}
      onSubmit={(event) => {
        if (submittingRef.current || pending) {
          event.preventDefault();
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Weekend trip, Flat 4B, Office lunch..."
          required
          autoFocus
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription id={errorId}>{error}</AlertDescription>
        </Alert>
      )}

      <p id={pendingId} className="sr-only" aria-live="polite">
        {pending ? "Creating group, please wait." : ""}
      </p>

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
        aria-disabled={pending}
        aria-describedby={pending ? pendingId : undefined}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Creating…
          </>
        ) : (
          "Create group"
        )}
      </Button>
    </form>
  );
}
