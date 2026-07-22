export type EmailValidationCode =
  | "empty"
  | "invalid"
  | "ok";

export function validateEmail(raw: string | null | undefined): {
  code: EmailValidationCode;
  email: string;
  message?: string;
} {
  const email = String(raw ?? "").trim();
  if (!email) {
    return { code: "empty", email, message: "Enter your email address." };
  }

  // Practical RFC 5322-inspired check (not overly strict)
  const ok =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254 &&
    !email.includes("..");

  if (!ok) {
    return {
      code: "invalid",
      email,
      message: "Enter a valid email address, like you@example.com.",
    };
  }

  return { code: "ok", email };
}

export function isEmailRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("email rate limit exceeded") ||
    (lower.includes("rate") && lower.includes("email")) ||
    lower.includes("too many requests") ||
    lower.includes("429")
  );
}

export function mapAuthServiceError(message: string): string {
  const lower = message.toLowerCase();

  if (isEmailRateLimitError(message)) {
    return "Too many magic-link emails were sent recently. Please wait about 60 minutes, or sign in with Google/Apple instead.";
  }

  if (lower.includes("too many") || lower.includes("rate")) {
    return "Too many sign-in attempts. Please wait a minute and try again.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("offline") ||
    lower.includes("failed to fetch")
  ) {
    return "Unable to reach the sign-in service. Check your connection and try again.";
  }

  return "We couldn’t send a magic link right now. Please try again.";
}

/** Client-side cooldown to avoid hammering Supabase email OTP. */
export const MAGIC_LINK_COOLDOWN_MS = 60_000;
export const MAGIC_LINK_RATE_LIMIT_COOLDOWN_MS = 60 * 60 * 1000;

export function magicLinkCooldownKey(email: string): string {
  return `lets-split:magic-link-cooldown:${email.trim().toLowerCase()}`;
}

export function getMagicLinkCooldownRemainingMs(
  email: string,
  now = Date.now()
): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(magicLinkCooldownKey(email));
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, until - now);
  } catch {
    return 0;
  }
}

export function setMagicLinkCooldown(
  email: string,
  durationMs: number,
  now = Date.now()
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      magicLinkCooldownKey(email),
      String(now + durationMs)
    );
  } catch {
    // ignore quota / private mode
  }
}
