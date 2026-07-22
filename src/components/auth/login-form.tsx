"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  signInWithMagicLink,
  signInWithOAuthProvider,
  signInWithPassword,
  signUpWithPassword,
} from "@/actions/auth";
import {
  getMagicLinkCooldownRemainingMs,
  MAGIC_LINK_COOLDOWN_MS,
  MAGIC_LINK_RATE_LIMIT_COOLDOWN_MS,
  setMagicLinkCooldown,
  validateEmail,
} from "@/lib/auth/email";
import { MIN_PASSWORD_LENGTH, validatePassword } from "@/lib/auth/password";
import {
  getEnabledAuthMethods,
  oauthProviderLabel,
  type OAuthProvider,
} from "@/lib/auth/oauth";
import { Mail } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";

interface LoginFormProps {
  redirectTo?: string;
  initialEmail?: string;
  inviteContext?: boolean;
}

type EmailAuthMode = "password" | "magic";

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

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.ceil(totalSec / 60);
  return `${mins} min`;
}

export function LoginForm({
  redirectTo = "/dashboard",
  initialEmail = "",
  inviteContext = false,
}: LoginFormProps) {
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const statusId = useId();
  const methods = getEnabledAuthMethods();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<EmailAuthMode>(
    methods.magicLink ? "magic" : "password"
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [oauthPending, startOAuthTransition] = useTransition();
  const [activeOAuth, setActiveOAuth] = useState<OAuthProvider | null>(null);

  const busy = loading || oauthPending;
  const coolingDown = cooldownMs > 0;

  useEffect(() => {
    const tick = () => {
      setCooldownMs(getMagicLinkCooldownRemainingMs(email));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [email]);

  function clearStatus() {
    setFieldError(null);
    setPasswordError(null);
    setStatusMessage(null);
    setStatusTone(null);
  }

  async function runPasswordAuth(mode: "signin" | "signup") {
    if (busy) return;

    const emailValidation = validateEmail(email);
    if (emailValidation.code !== "ok") {
      setFieldError(emailValidation.message ?? "Enter a valid email address.");
      setStatusMessage(null);
      setStatusTone(null);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (passwordValidation.code !== "ok") {
      setPasswordError(passwordValidation.message ?? "Enter a password.");
      setStatusMessage(null);
      setStatusTone(null);
      return;
    }

    setLoading(true);
    clearStatus();

    const formData = new FormData();
    formData.set("email", emailValidation.email);
    formData.set("password", passwordValidation.password);
    formData.set("redirect", redirectTo);

    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatusTone("error");
        setStatusMessage(
          "You appear to be offline. Check your connection and try again."
        );
        return;
      }

      const result =
        mode === "signup"
          ? await signUpWithPassword(formData)
          : await signInWithPassword(formData);

      if (result && "error" in result && result.error) {
        if ("rateLimited" in result && result.rateLimited && methods.password) {
          setEmailMode("password");
        }
        setStatusTone("error");
        setStatusMessage(result.error);
        return;
      }

      if (result && "success" in result && result.success) {
        setStatusTone("success");
        setStatusMessage(
          result.message ??
            ("needsEmailConfirmation" in result && result.needsEmailConfirmation
              ? "Check your email to confirm your account."
              : "Signed in.")
        );
      }
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setStatusTone("error");
      setStatusMessage(
        "Unable to reach the sign-in service. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordAuth(
    event: React.FormEvent<HTMLFormElement>,
    mode: "signin" | "signup"
  ) {
    event.preventDefault();
    await runPasswordAuth(mode);
  }

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

    const remaining = getMagicLinkCooldownRemainingMs(validation.email);
    if (remaining > 0) {
      setStatusTone("error");
      setStatusMessage(
        `Please wait ${formatRemaining(remaining)} before requesting another magic link.`
      );
      setCooldownMs(remaining);
      if (methods.password) setEmailMode("password");
      return;
    }

    setLoading(true);
    clearStatus();

    const formData = new FormData();
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
        if (result.rateLimited) {
          setMagicLinkCooldown(
            validation.email,
            MAGIC_LINK_RATE_LIMIT_COOLDOWN_MS
          );
          setCooldownMs(MAGIC_LINK_RATE_LIMIT_COOLDOWN_MS);
          if (methods.password) setEmailMode("password");
        }
        setStatusTone("error");
        setStatusMessage(result.error);
        return;
      }

      if (result.success) {
        setMagicLinkCooldown(validation.email, MAGIC_LINK_COOLDOWN_MS);
        setCooldownMs(MAGIC_LINK_COOLDOWN_MS);
        setStatusTone("success");
        setStatusMessage(
          result.message ?? "Check your email for a magic link."
        );
      }
    } catch (err) {
      if (isRedirectError(err)) throw err;
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
    clearStatus();
    setActiveOAuth(provider);

    startOAuthTransition(async () => {
      try {
        const result = await signInWithOAuthProvider(provider, redirectTo);
        if (result?.error) {
          setStatusTone("error");
          setStatusMessage(result.error);
          setActiveOAuth(null);
        }
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
  const showPasswordInvalid = Boolean(passwordError);

  return (
    <div className="space-y-5">
      {inviteContext && (
        <Alert className="border-brand-teal/30 bg-brand-teal/5">
          <AlertDescription className="text-brand-navy">
            Sign in to accept your group invite. Invite links do not send email
            by themselves — use email & password if magic links are rate-limited.
          </AlertDescription>
        </Alert>
      )}

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

          {(methods.password || methods.magicLink) && (
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

      {methods.password && methods.magicLink ? (
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1"
          role="tablist"
          aria-label="Email sign-in method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={emailMode === "magic"}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              emailMode === "magic"
                ? "bg-card text-brand-navy shadow-sm"
                : "text-brand-muted hover:text-brand-navy"
            }`}
            onClick={() => {
              setEmailMode("magic");
              clearStatus();
            }}
          >
            Magic link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={emailMode === "password"}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              emailMode === "password"
                ? "bg-card text-brand-navy shadow-sm"
                : "text-brand-muted hover:text-brand-navy"
            }`}
            onClick={() => {
              setEmailMode("password");
              clearStatus();
            }}
          >
            Email & password
          </button>
        </div>
      ) : null}

      {(methods.password || methods.magicLink) && (
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
      )}

      {methods.password && emailMode === "password" && (
        <form
          onSubmit={(event) => handlePasswordAuth(event, "signin")}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="password" className="text-brand-navy">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError(null);
              }}
              aria-invalid={showPasswordInvalid || undefined}
              aria-describedby={
                showPasswordInvalid ? passwordErrorId : undefined
              }
              disabled={busy}
              className="h-11 border-border/80 bg-background"
            />
            {passwordError && (
              <p
                id={passwordErrorId}
                role="alert"
                className="text-sm text-destructive"
              >
                {passwordError}
              </p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="submit"
              className="h-11 w-full bg-brand-blue text-base hover:bg-brand-blue/90"
              disabled={busy}
              aria-busy={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full text-base"
              disabled={busy}
              onClick={() => {
                void runPasswordAuth("signup");
              }}
            >
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
          <p className="text-center text-xs text-brand-muted">
            Password sign-up does not send email, so it works even when magic
            links are rate-limited.
          </p>
        </form>
      )}

      {methods.magicLink && emailMode === "magic" && (
        <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
          <Button
            type="submit"
            className="h-11 w-full bg-brand-blue text-base hover:bg-brand-blue/90"
            disabled={busy || coolingDown}
            aria-busy={loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            {loading
              ? "Sending link..."
              : coolingDown
                ? `Wait ${formatRemaining(cooldownMs)}`
                : "Send magic link"}
          </Button>
          {coolingDown ? (
            <p className="text-center text-xs text-brand-muted">
              Built-in auth email is limited to a few sends per hour. Prefer
              email & password until the cooldown ends.
            </p>
          ) : null}
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
