"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithMagicLink } from "@/actions/auth";
import { Mail } from "lucide-react";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(formData: FormData) {
    setLoading(true);
    setError(null);
    setMessage(null);
    formData.set("redirect", redirectTo);
    const result = await signInWithMagicLink(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.success) {
      setMessage(
        result.message ??
          "Check your email for a magic link. Open it in this browser — links work only once."
      );
    }
  }

  return (
    <div className="space-y-5">
      <form action={handleMagicLink} className="space-y-4" aria-busy={loading}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-brand-navy">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={loading}
            className="h-11 border-border/80 bg-background"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <Button
          type="submit"
          className="h-11 w-full bg-brand-blue text-base hover:bg-brand-blue/90"
          disabled={loading}
          aria-disabled={loading}
        >
          <Mail className="mr-2 h-4 w-4" />
          {loading ? "Sending link..." : "Send magic link"}
        </Button>
      </form>

      <p className="sr-only" aria-live="polite">
        {loading ? "Sending magic link, please wait." : ""}
      </p>

      {message && (
        <Alert className="border-brand-teal/30 bg-brand-teal/5">
          <AlertDescription className="text-brand-navy">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
