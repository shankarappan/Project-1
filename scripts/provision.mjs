#!/usr/bin/env node
/**
 * Provisions Supabase + Vercel for Lets Split.
 *
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN - https://supabase.com/dashboard/account/tokens
 *   VERCEL_TOKEN          - https://vercel.com/account/tokens
 *
 * Optional:
 *   SUPABASE_ORG_ID       - auto-detected if omitted
 *   SUPABASE_DB_PASSWORD  - auto-generated if omitted
 *   VERCEL_TEAM_ID        - personal account if omitted
 *   PROJECT_NAME          - default: lets-split
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_NAME = process.env.PROJECT_NAME ?? "lets-split";
const SUPABASE_API = "https://api.supabase.com/v1";
const VERCEL_API = "https://api.vercel.com";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

async function supabaseRequest(token, path, options = {}) {
  const response = await fetch(`${SUPABASE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Supabase API ${path} failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function vercelRequest(token, path, options = {}) {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const url = new URL(`${VERCEL_API}${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Vercel API ${path} failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function waitForSupabaseProject(token, ref) {
  for (let attempt = 1; attempt <= 60; attempt++) {
    const project = await supabaseRequest(token, `/projects/${ref}`);
    if (project.status === "ACTIVE_HEALTHY") {
      return project;
    }
    log("supabase", `Waiting for project to become healthy (${attempt}/60)...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error("Timed out waiting for Supabase project to become healthy.");
}

async function runMigration(token, ref) {
  const migrationPath = join(ROOT, "supabase/migrations/001_schema.sql");
  const sql = readFileSync(migrationPath, "utf8");
  log("supabase", "Running database migration...");
  await supabaseRequest(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: sql }),
  });
}

async function configureSupabaseAuth(token, ref, appUrl) {
  log("supabase", "Configuring auth redirect URLs...");
  const current = await supabaseRequest(token, `/projects/${ref}/config/auth`);

  const redirectUrls = new Set([
    ...(current.additional_redirect_urls ?? []),
    `${appUrl}/auth/callback`,
    "http://localhost:3000/auth/callback",
  ]);

  await supabaseRequest(token, `/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      site_url: appUrl,
      additional_redirect_urls: Array.from(redirectUrls),
    }),
  });
}

async function getOrCreateSupabaseProject(token) {
  const projects = await supabaseRequest(token, "/projects");
  const existing = projects.find((p) => p.name === PROJECT_NAME);
  if (existing) {
    log("supabase", `Using existing project: ${existing.name} (${existing.id})`);
    return existing;
  }

  let orgId = process.env.SUPABASE_ORG_ID?.trim();
  if (!orgId) {
    const orgs = await supabaseRequest(token, "/organizations");
    if (!orgs?.length) {
      log("supabase", 'No organizations found — creating "Lets Split" organization...');
      const createdOrg = await supabaseRequest(token, "/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Lets Split" }),
      });
      orgId = createdOrg.id;
    } else {
      orgId = orgs[0].id;
      log("supabase", `Using organization: ${orgs[0].name}`);
    }
  }

  const dbPass =
    process.env.SUPABASE_DB_PASSWORD ??
    randomBytes(16).toString("base64url") + "Aa1!";

  log("supabase", `Creating project "${PROJECT_NAME}"...`);
  const created = await supabaseRequest(token, "/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: orgId,
      name: PROJECT_NAME,
      db_pass: dbPass,
      region: process.env.SUPABASE_REGION ?? "ap-southeast-2",
    }),
  });

  return waitForSupabaseProject(token, created.id);
}

async function getSupabaseKeys(token, ref) {
  const keys = await supabaseRequest(token, `/projects/${ref}/api-keys`);
  const anon = keys.find((k) => k.name === "anon");
  const service = keys.find((k) => k.name === "service_role");
  if (!anon) throw new Error("Could not find Supabase anon key.");
  return { anon, service };
}

async function getOrCreateVercelProject(token, name) {
  const projects = await vercelRequest(token, "/v9/projects");
  const existing = projects.projects?.find((p) => p.name === name);
  if (existing) {
    log("vercel", `Using existing project: ${existing.name}`);
    return existing;
  }

  log("vercel", `Creating project "${name}"...`);
  return vercelRequest(token, "/v11/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      framework: "nextjs",
    }),
  });
}

async function setVercelEnv(token, projectId, key, value, target = ["production", "preview", "development"]) {
  const existing = await vercelRequest(token, `/v10/projects/${projectId}/env`);
  const match = existing.envs?.find((env) => env.key === key);

  if (match) {
    await vercelRequest(token, `/v10/projects/${projectId}/env/${match.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value, target }),
    });
    return;
  }

  await vercelRequest(token, `/v10/projects/${projectId}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type: key.includes("KEY") || key.includes("SECRET") ? "encrypted" : "plain",
      target,
    }),
  });
}

async function deployVercel(token, projectName) {
  log("vercel", "Triggering production deployment...");
  const { execSync } = await import("node:child_process");
  execSync(`npx vercel@latest deploy --prod --yes --token ${token} --name ${projectName}`, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      VERCEL_TOKEN: token,
    },
  });
}

function writeEnvLocal(values) {
  const lines = [
    "# Generated by scripts/provision.mjs",
    `NEXT_PUBLIC_SUPABASE_URL=${values.supabaseUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${values.serviceRoleKey ?? ""}`,
    `NEXT_PUBLIC_APP_URL=${values.appUrl}`,
    "",
  ];
  writeFileSync(join(ROOT, ".env.local"), lines.join("\n"));
  log("env", "Wrote .env.local");
}

async function main() {
  const supabaseToken = requireEnv("SUPABASE_ACCESS_TOKEN");
  const vercelToken = requireEnv("VERCEL_TOKEN");

  const project = await getOrCreateSupabaseProject(supabaseToken);
  const ref = project.id;
  const supabaseUrl = `https://${ref}.supabase.co`;

  await runMigration(supabaseToken, ref);
  const { anon, service } = await getSupabaseKeys(supabaseToken, ref);

  const vercelProject = await getOrCreateVercelProject(vercelToken, PROJECT_NAME);
  const vercelProjectId = vercelProject.id;

  const provisionalAppUrl = `https://${PROJECT_NAME}.vercel.app`;
  await configureSupabaseAuth(supabaseToken, ref, provisionalAppUrl);

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon.api_key,
    SUPABASE_SERVICE_ROLE_KEY: service?.api_key ?? "",
    NEXT_PUBLIC_APP_URL: provisionalAppUrl,
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;
    log("vercel", `Setting env var ${key}`);
    await setVercelEnv(vercelToken, vercelProjectId, key, value);
  }

  writeEnvLocal({
    supabaseUrl,
    anonKey: anon.api_key,
    serviceRoleKey: service?.api_key,
    appUrl: provisionalAppUrl,
  });

  await deployVercel(vercelToken, PROJECT_NAME);

  const deploymentUrl = `https://${PROJECT_NAME}.vercel.app`;
  await configureSupabaseAuth(supabaseToken, ref, deploymentUrl);
  await setVercelEnv(vercelToken, vercelProjectId, "NEXT_PUBLIC_APP_URL", deploymentUrl);
  writeEnvLocal({
    supabaseUrl,
    anonKey: anon.api_key,
    serviceRoleKey: service?.api_key,
    appUrl: deploymentUrl,
  });

  console.log("\nProvisioning complete.\n");
  console.log(`App URL:        ${deploymentUrl}`);
  console.log(`Supabase URL:   ${supabaseUrl}`);
  console.log(`Supabase ref:   ${ref}`);
  console.log(`Vercel project: ${vercelProjectId}`);
  console.log("\nNext steps:");
  console.log("1. Open the app and sign in with a magic link");
  console.log("2. Click 'Load demo data' on the dashboard");
  console.log("3. Optional: enable Google OAuth in Supabase Auth providers");
}

main().catch((error) => {
  console.error("\nProvisioning failed:");
  console.error(error.message ?? error);
  process.exit(1);
});
