/**
 * Build Content-Security-Policy from origins the app actually uses.
 * Supabase Auth/DB: NEXT_PUBLIC_SUPABASE_URL
 * No wildcard https:, no unsafe-eval.
 * style-src includes 'unsafe-inline' because Tailwind/Next inline styles require it
 * without a full nonce pipeline for every style tag.
 */

export function buildContentSecurityPolicy(options: {
  supabaseUrl?: string | null;
  nonce?: string;
}): string {
  const supabaseOrigin = originFromUrl(options.supabaseUrl);
  const connectSrc = ["'self'", supabaseOrigin, supabaseOrigin?.replace("https:", "wss:")]
    .filter(Boolean)
    .join(" ");

  const scriptSrc = options.nonce
    ? `'self' 'nonce-${options.nonce}' 'strict-dynamic'`
    : `'self'`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
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
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";

  const headers: Record<string, string> = {
    "Content-Security-Policy": buildContentSecurityPolicy({
      supabaseUrl: options.supabaseUrl,
      nonce: options.nonce,
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
