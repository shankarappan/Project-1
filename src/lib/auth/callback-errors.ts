export type AuthCallbackErrorCode =
  | "missing_code"
  | "expired"
  | "used"
  | "pkce"
  | "rate_limit"
  | "network"
  | "auth";

const MESSAGES: Record<AuthCallbackErrorCode, string> = {
  missing_code:
    "This sign-in link is incomplete or invalid. Request a new magic link.",
  expired:
    "This magic link has expired. Request a new one to sign in.",
  used:
    "This magic link was already used. Magic links work only once — request a new one.",
  pkce:
    "This magic link must be opened in the same browser where you requested it. Request a new link in this browser.",
  rate_limit:
    "Too many sign-in attempts. Please wait a few minutes and try again.",
  network:
    "Unable to reach the sign-in service. Check your connection and try again.",
  auth: "Sign-in failed. Request a new magic link and try again.",
};

export function mapAuthCallbackError(message: string | null | undefined): {
  code: AuthCallbackErrorCode;
  message: string;
} {
  const lower = String(message ?? "").toLowerCase();

  if (!lower) {
    return { code: "auth", message: MESSAGES.auth };
  }

  if (
    lower.includes("flow state") ||
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("both auth code and code verifier")
  ) {
    return { code: "pkce", message: MESSAGES.pkce };
  }

  if (
    lower.includes("expired") ||
    lower.includes("otp_expired") ||
    lower.includes("token has expired")
  ) {
    return { code: "expired", message: MESSAGES.expired };
  }

  if (
    lower.includes("already been used") ||
    lower.includes("already used") ||
    lower.includes("invalid login credentials") ||
    lower.includes("otp_disabled") ||
    (lower.includes("invalid") && lower.includes("otp"))
  ) {
    return { code: "used", message: MESSAGES.used };
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    lower.includes("429")
  ) {
    return { code: "rate_limit", message: MESSAGES.rate_limit };
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("offline")
  ) {
    return { code: "network", message: MESSAGES.network };
  }

  return { code: "auth", message: MESSAGES.auth };
}

export function getAuthErrorMessage(
  code: string | null | undefined,
  rawMessage?: string | null
): string {
  if (code && code in MESSAGES) {
    return MESSAGES[code as AuthCallbackErrorCode];
  }

  if (rawMessage) {
    return mapAuthCallbackError(rawMessage).message;
  }

  return MESSAGES.auth;
}

export function mapMagicLinkSendError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("rate limit") ||
    lower.includes("email rate limit exceeded") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return "Too many magic links were requested recently. Please wait about an hour and try again.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("offline")
  ) {
    return "Unable to reach the sign-in service. Check your connection and try again.";
  }

  return "We couldn’t send a magic link right now. Please try again.";
}
