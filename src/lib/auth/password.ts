export type PasswordValidationCode = "empty" | "short" | "ok";

export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(raw: string | null | undefined): {
  code: PasswordValidationCode;
  password: string;
  message?: string;
} {
  const password = String(raw ?? "");
  if (!password) {
    return {
      code: "empty",
      password,
      message: "Enter a password.",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      code: "short",
      password,
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  return { code: "ok", password };
}
