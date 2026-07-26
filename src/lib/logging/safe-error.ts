import { randomBytes } from "crypto";

/** Stable end-user message + server-only diagnostic id (never raw DB text). */
export function userFacingActionError(
  logLabel: string,
  error: { code?: string; message?: string } | null | undefined,
  fallbackMessage: string
): { userMessage: string; correlationId: string } {
  const correlationId = randomBytes(4).toString("hex");
  console.error(
    JSON.stringify({
      level: "error",
      event: logLabel,
      correlationId,
      code: error?.code ?? null,
      // Truncate/sanitize — do not emit tokens or full row payloads.
      message: String(error?.message ?? "").slice(0, 180),
    })
  );
  return {
    correlationId,
    userMessage: `${fallbackMessage} (ref ${correlationId})`,
  };
}
