export type OAuthProvider = "google" | "apple";

export const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "apple"];

/**
 * Which SSO providers to show on the login screen.
 * Configure with NEXT_PUBLIC_AUTH_PROVIDERS=magic,google,apple
 * (comma-separated). Defaults to magic + google + apple.
 *
 * Enabling a button does not configure the provider in Supabase —
 * that still requires Client ID/Secret (and Apple Developer setup).
 */
export function getEnabledAuthMethods(): {
  magicLink: boolean;
  oauth: OAuthProvider[];
} {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS?.trim();
  const methods = raw
    ? raw
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
    : ["magic", "google", "apple"];

  const oauth = OAUTH_PROVIDERS.filter((provider) =>
    methods.includes(provider)
  );

  return {
    magicLink: methods.includes("magic") || methods.length === 0,
    oauth,
  };
}

export function oauthProviderLabel(provider: OAuthProvider): string {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
  }
}
