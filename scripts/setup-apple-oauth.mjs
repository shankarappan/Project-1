#!/usr/bin/env node
/**
 * Enable Apple OAuth (Sign in with Apple) on the Supabase project.
 *
 * Required:
 *   SUPABASE_ACCESS_TOKEN
 *   APPLE_CLIENT_ID          # Services ID (e.g. com.example.lets-split.web)
 *   APPLE_SECRET             # JWT client secret generated from Apple key
 *   APPLE_TEAM_ID            # optional but recommended (logged for docs)
 *   APPLE_KEY_ID             # optional but recommended (logged for docs)
 *
 * Optional:
 *   SUPABASE_PROJECT_REF (default: bdtbqwipwyitqsflvphk)
 *
 * Apple Developer Console checklist:
 * 1. Certificates, Identifiers & Profiles → Identifiers → App IDs: enable Sign In with Apple
 * 2. Create a Services ID for the web app
 * 3. Configure domains + return URL:
 *      https://<project-ref>.supabase.co/auth/v1/callback
 * 4. Create a Key with Sign In with Apple, download .p8, build the client secret JWT
 *    (Supabase docs: Authentication → Providers → Apple)
 */

const SUPABASE_API = "https://api.supabase.com/v1";
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "bdtbqwipwyitqsflvphk";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const token = requireEnv("SUPABASE_ACCESS_TOKEN");
  const clientId = requireEnv("APPLE_CLIENT_ID");
  const secret = requireEnv("APPLE_SECRET");
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();

  const callbackUrl = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;
  console.log(`Supabase Apple callback URL: ${callbackUrl}`);
  console.log("Ensure this return URL is configured on your Apple Services ID.");
  if (teamId) console.log(`Apple Team ID: ${teamId}`);
  if (keyId) console.log(`Apple Key ID: ${keyId}`);

  const response = await fetch(`${SUPABASE_API}/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_apple_enabled: true,
      external_apple_client_id: clientId,
      external_apple_secret: secret,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to configure Apple OAuth: ${JSON.stringify(body)}`);
  }

  console.log("Apple OAuth enabled successfully.");
  console.log(`external_apple_enabled: ${body.external_apple_enabled}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
