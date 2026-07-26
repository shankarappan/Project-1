/**
 * Allowlist relative in-app paths only.
 * Rejects protocol-relative URLs (//evil.com), absolute URLs, and escape sequences.
 */
export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (raw == null) return fallback;

  let value = String(raw).trim();
  if (!value) return fallback;

  // Decode once so encoded tricks like %2F%2Fevil.com are caught.
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  value = value.trim();

  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  // Keep query/hash for in-app deep links, but still require a path prefix.
  const pathOnly = value.split(/[?#]/, 1)[0] ?? value;
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) return fallback;

  return value;
}
