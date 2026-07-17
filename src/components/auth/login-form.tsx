"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  signInWithMagicLink,
  signInWithOAuthProvider,
} from "@/actions/auth";
import { validateEmail } from "@/lib/auth/email";
import {
  getEnabledAuthMethods,
  oauthProviderLabel,
  type OAuthProvider,
} from "@/lib/auth/oauth";
import { Mail } from "lucide-react";

interface LoginFormProps {
  redirectTo?: string;
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mr-2 h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mr-2 h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1-.1 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.5ZM14.7 6.4c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.6 1.3-.5.6-1 1.6-.9 2.5 1 .1 1.9-.4 2.6-1.1Z" />
    </svg>
  );
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const emailErrorId = useId();
  const statusId = useId();
  const methods = getEnabledAuthMethods();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [oauthPending, startOAuthTransition] = useTransition();
  const [activeOAuth, setActiveOAuth] = useState<OAuthProvider | null>(null);

  const busy = loading || oauthPending;

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

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

  function handleOAuth(provider: OAuthProvider) {
    if (busy) return;
    setFieldError(null);
    setStatusMessage(null);
    setStatusTone(null);
    setActiveOAuth(provider);

    startOAuthTransition(async () => {
      try {
        const result = await signInWithOAuthProvider(provider, redirectTo);
        if (result?.error) {
          setStatusTone("error");
          setStatusMessage(result.error);
          setActiveOAuth(null);
        }
        // On success Next.js redirects away to the provider.
      } catch {
        setStatusTone("error");
        setStatusMessage(
          `Unable to start ${oauthProviderLabel(provider)} sign-in. Check your connection and try again.`
        );
        setActiveOAuth(null);
      }
    });
  }

  const showInvalid = Boolean(fieldError);

  return (
    <div className="space-y-5">
      {methods.oauth.length > 0 && (
        <div className="space-y-3">
          {methods.oauth.map((provider) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className="h-11 w-full text-base"
              disabled={busy}
              aria-busy={oauthPending && activeOAuth === provider}
              onClick={() => handleOAuth(provider)}
            >
              {provider === "google" ? <GoogleIcon /> : <AppleIcon />}
              {oauthPending && activeOAuth === provider
                ? `Connecting to ${oauthProviderLabel(provider)}...`
                : `Continue with ${oauthProviderLabel(provider)}`}
            </Button>
          ))}

          {methods.magicLink && (
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-brand-muted">or</span>
              </div>
            </div>
          )}
        </div>
      )}

      {methods.magicLink && (
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
              disabled={busy}
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
            disabled={busy}
            aria-busy={loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            {loading ? "Sending link..." : "Send magic link"}
          </Button>
        </form>
      )}

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
