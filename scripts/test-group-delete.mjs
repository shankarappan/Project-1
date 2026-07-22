#!/usr/bin/env node
/**
 * Focused live scenario: create group → member cannot delete → admin deletes.
 * Requires .env.local with Supabase URL, anon key, service role, and access token.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const users = {
  adminUser: {
    email: `del-admin-${stamp}@lets-split.test`,
    password: `Del-Admin-${stamp}!Aa`,
    id: "",
  },
  member: {
    email: `del-member-${stamp}@lets-split.test`,
    password: `Del-Member-${stamp}!Aa`,
    id: "",
  },
};

let groupId = "";
let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}
function fail(name, detail) {
  failed++;
  console.error(`  ✗ ${name}: ${detail}`);
}

async function applyMigration006() {
  const sql = readFileSync(
    join(__dirname, "../supabase/migrations/006_group_delete.sql"),
    "utf8"
  );
  const ref = url.match(/https:\/\/([^.]+)/)?.[1];
  if (!accessToken || !ref) {
    fail("Apply migration 006", "missing SUPABASE_ACCESS_TOKEN or project ref");
    return false;
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await response.text();
  if (!response.ok && !/already exists|duplicate/i.test(body)) {
    fail("Apply migration 006", body.slice(0, 300));
    return false;
  }
  ok("Applied migration 006_group_delete.sql");
  return true;
}

async function createUser(key) {
  const u = users[key];
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? `create ${key}`);
  u.id = data.user.id;

  await admin.from("profiles").upsert({
    id: u.id,
    email: u.email,
    full_name: key,
  });
  ok(`Created user ${key}`);
}

async function signIn(key) {
  const u = users[key];
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  if (error || !data.session) throw new Error(error?.message ?? `signIn ${key}`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function cleanup() {
  if (groupId) {
    await admin.from("groups").delete().eq("id", groupId);
  }
  for (const key of Object.keys(users)) {
    if (users[key].id) await admin.auth.admin.deleteUser(users[key].id);
  }
  ok("Cleaned up test data");
}

async function main() {
  console.log("\nGroup delete scenario\n");

  try {
    const migrated = await applyMigration006();
    if (!migrated) throw new Error("Migration 006 required for this scenario");

    await createUser("adminUser");
    await createUser("member");

    const clientAdmin = await signIn("adminUser");
    const clientMember = await signIn("member");

    const { data: group, error: groupError } = await clientAdmin
      .from("groups")
      .insert({
        name: `Delete Scenario ${stamp}`,
        created_by: users.adminUser.id,
      })
      .select("id")
      .single();

    if (groupError || !group) {
      fail("Create group", groupError?.message ?? "no data");
      throw new Error("create group failed");
    }
    groupId = group.id;

    const { error: memberError } = await clientAdmin.from("group_members").insert([
      { group_id: groupId, user_id: users.adminUser.id, role: "admin" },
      { group_id: groupId, user_id: users.member.id, role: "member" },
    ]);
    if (memberError) {
      fail("Add members", memberError.message);
      throw new Error("members failed");
    }
    ok("Created group with admin + member");

    // Seed an expense so cascade delete is meaningful
    const { data: expense, error: expenseError } = await clientAdmin
      .from("expenses")
      .insert({
        group_id: groupId,
        paid_by: users.adminUser.id,
        created_by: users.adminUser.id,
        title: "Taxi",
        amount: 40,
        split_type: "equal",
        expense_date: "2026-07-22",
      })
      .select("id")
      .single();
    if (expenseError || !expense) {
      fail("Create expense", expenseError?.message ?? "no data");
    } else {
      await clientAdmin.from("expense_participants").insert([
        {
          expense_id: expense.id,
          user_id: users.adminUser.id,
          share_amount: 20,
          share_percentage: 50,
        },
        {
          expense_id: expense.id,
          user_id: users.member.id,
          share_amount: 20,
          share_percentage: 50,
        },
      ]);
      ok("Added expense to group");
    }

    // Member should NOT be able to delete
    const memberDelete = await clientMember
      .from("groups")
      .delete()
      .eq("id", groupId)
      .select("id");
    if (memberDelete.error) {
      ok(`Member delete blocked by error (${memberDelete.error.code ?? "rls"})`);
    } else if (!memberDelete.data?.length) {
      ok("Member delete blocked (0 rows deleted under RLS)");
    } else {
      fail("Member delete blocked", "member deleted the group");
      groupId = "";
      throw new Error("member delete should fail");
    }

    const { data: stillThere } = await admin
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .maybeSingle();
    if (stillThere?.id === groupId) ok("Group still exists after member attempt");
    else fail("Group still exists", "group missing after member delete attempt");

    // Admin can delete
    const adminDelete = await clientAdmin
      .from("groups")
      .delete()
      .eq("id", groupId)
      .select("id");
    if (adminDelete.error) {
      fail("Admin delete", adminDelete.error.message);
    } else if (!adminDelete.data?.length) {
      // Some PostgREST/RLS setups return no rows even on success; verify absence
      const { data: check } = await admin
        .from("groups")
        .select("id")
        .eq("id", groupId)
        .maybeSingle();
      if (!check) {
        ok("Admin deleted group (verified absent)");
        groupId = "";
      } else {
        fail("Admin delete", "group still present and no rows returned");
      }
    } else {
      ok("Admin deleted group");
      groupId = "";
    }

    const { data: leftovers } = await admin
      .from("groups")
      .select("id, name")
      .eq("name", `Delete Scenario ${stamp}`);
    if (!leftovers?.length) ok("Deleted group no longer listed");
    else fail("Deleted group no longer listed", JSON.stringify(leftovers));
  } catch (err) {
    fail("Unexpected error", err instanceof Error ? err.message : String(err));
  } finally {
    await cleanup();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
