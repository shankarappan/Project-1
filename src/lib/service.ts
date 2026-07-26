/** Stable message when migration 003 RPCs are not available. Fail closed — no legacy path. */
export const MIGRATION_REQUIRED_MESSAGE =
  "This feature requires a service update. Please try again after the latest database migration is applied.";

export function isRpcMissing(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    /could not find the function|PGRST202/i.test(error.message ?? "")
  );
}
