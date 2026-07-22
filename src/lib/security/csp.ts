/**
 * Build Content-Security-Policy from origins the app actually uses.
 * Supabase Auth/DB: NEXT_PUBLIC_SUPABASE_URL
 * No wildcard https:, no unsafe-eval in production.
 *
 * Next.js requires a per-request script nonce (or unsafe-inline) so framework
 * bootstrap scripts can run. Without it, login forms never hydrate.
 */

export function buildContentSecurityPolicy(options: {
  supabaseUrl?: string | null;
  nonce?: string;
  isDev?: boolean;
}): string {
  const supabaseOrigin = originFromUrl(options.supabaseUrl);
  const connectSrc = ["'self'", supabaseOrigin, supabaseOrigin?.replace("https:", "wss:")]
    .filter(Boolean)
    .join(" ");

  const isDev =
    options.isDev ?? process.env.NODE_ENV !== "production";

  // Production: nonce + strict-dynamic (Next attaches nonce to its scripts).
  // Development: allow inline/eval for Turbopack/React refresh tooling.
  let scriptSrc: string;
  if (isDev) {
    scriptSrc = `'self' 'unsafe-inline' 'unsafe-eval'`;
  } else if (options.nonce) {
    scriptSrc = `'self' 'nonce-${options.nonce}' 'strict-dynamic'`;
  } else {
    // Fail open enough for auth to work if nonce generation is skipped.
    scriptSrc = `'self' 'unsafe-inline'`;
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Tailwind / Next still emit inline styles without a full style-nonce pipeline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

export function securityHeaders(options: {
  supabaseUrl?: string | null;
  nonce?: string;
  isProduction?: boolean;
}): Record<string, string> {
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";

  const headers: Record<string, string> = {
    "Content-Security-Policy": buildContentSecurityPolicy({
      supabaseUrl: options.supabaseUrl,
      nonce: options.nonce,
      isDev: !isProduction,
    }),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-DNS-Prefetch-Control": "on",
    "Cross-Origin-Opener-Policy": "same-origin",
  };

  if (isProduction) {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

function originFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
