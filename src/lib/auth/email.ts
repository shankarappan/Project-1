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

export function mapAuthServiceError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("rate") ||
    lower.includes("too many") ||
    lower.includes("429")
  ) {
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
