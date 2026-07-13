#!/usr/bin/env node
/**
 * Enable Google OAuth on the Supabase project.
 *
 * Required:
 *   SUPABASE_ACCESS_TOKEN
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * Optional:
 *   SUPABASE_PROJECT_REF (default: bdtbqwipwyitqsflvphk)
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
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const callbackUrl = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;
  console.log(`Supabase Google callback URL: ${callbackUrl}`);
  console.log("Ensure this URI is listed under Authorized redirect URIs in Google Cloud Console.");

  const response = await fetch(`${SUPABASE_API}/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_google_enabled: true,
      external_google_client_id: clientId,
      external_google_secret: clientSecret,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to configure Google OAuth: ${JSON.stringify(body)}`);
  }

  console.log("Google OAuth enabled successfully.");
  console.log(`external_google_enabled: ${body.external_google_enabled}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
