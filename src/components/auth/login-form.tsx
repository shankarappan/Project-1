"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithMagicLink } from "@/actions/auth";
import { validateEmail } from "@/lib/auth/email";
import { Mail } from "lucide-react";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const emailErrorId = useId();
  const statusId = useId();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const validation = validateEmail(email);
    if (validation.code !== "ok") {
      setFieldError(validation.message ?? "Enter a valid email address.");
      setStatusMessage(null);
      setStatusTone(null);
      return;
    }

    setLoading(true);
    setFieldError(null);
    setStatusMessage(null);
    setStatusTone(null);

    const formData = new FormData(event.currentTarget);
    formData.set("email", validation.email);
    formData.set("redirect", redirectTo);

    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatusTone("error");
        setStatusMessage(
          "You appear to be offline. Check your connection and try again."
        );
        return;
      }

      const result = await signInWithMagicLink(formData);

      if (result.error) {
        setStatusTone("error");
        setStatusMessage(result.error);
        return;
      }

      if (result.success) {
        setStatusTone("success");
        setStatusMessage(
          result.message ?? "Check your email for a magic link."
        );
      }
    } catch {
      setStatusTone("error");
      setStatusMessage(
        "Unable to reach the sign-in service. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const showInvalid = Boolean(fieldError);

  return (
    <div className="space-y-5">
      <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-brand-navy">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldError) setFieldError(null);
            }}
            aria-invalid={showInvalid || undefined}
            aria-describedby={
              showInvalid
                ? emailErrorId
                : statusMessage
                  ? statusId
                  : undefined
            }
            disabled={loading}
            className="h-11 border-border/80 bg-background"
          />
          {fieldError && (
            <p
              id={emailErrorId}
              role="alert"
              className="text-sm text-destructive"
            >
              {fieldError}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="h-11 w-full bg-brand-blue text-base hover:bg-brand-blue/90"
          disabled={loading}
          aria-busy={loading}
        >
          <Mail className="mr-2 h-4 w-4" />
          {loading ? "Sending link..." : "Send magic link"}
        </Button>
      </form>

      <div id={statusId} aria-live="polite" aria-atomic="true">
        {statusMessage && statusTone === "success" && (
          <Alert className="border-brand-teal/30 bg-brand-teal/5">
            <AlertDescription className="text-brand-navy">
              {statusMessage}
            </AlertDescription>
          </Alert>
        )}
        {statusMessage && statusTone === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
