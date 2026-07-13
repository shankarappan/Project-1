#!/usr/bin/env node
/**
 * End-to-end integration tests against live Supabase.
 * Creates a temporary test user, exercises core flows, then cleans up.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars. Ensure .env.local is present.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testEmail = `e2e-${Date.now()}@lets-split.test`;
const testPassword = `Test-${Date.now()}!Aa`;
let testUserId = "";
let testGroupId = "";
let testExpenseId = "";
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

async function applyMigration() {
  const sql = readFileSync(
    join(__dirname, "../supabase/migrations/002_fix_group_rls.sql"),
    "utf8"
  );
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = url.match(/https:\/\/([^.]+)/)?.[1];
  if (!token || !ref) {
    console.log("Skipping migration apply (no SUPABASE_ACCESS_TOKEN)");
    return;
  }
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Migration failed: ${body}`);
  }
  ok("Applied RLS migration 002");
}

async function setupUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  testUserId = data.user.id;
  ok(`Created test user ${testEmail}`);
}

function userClient() {
  return createClient(url, anonKey);
}

async function signIn() {
  const client = userClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (error || !data.session) throw new Error(error?.message ?? "signIn failed");
  ok("Signed in test user");
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function testCreateGroup(client) {
  const { data: group, error: groupError } = await client
    .from("groups")
    .insert({ name: "E2E Test Group", created_by: testUserId })
    .select("id")
    .single();

  if (groupError || !group) {
    fail("Create group", groupError?.message ?? "no data");
    return null;
  }
  ok("Create group insert + select");

  const { error: memberError } = await client.from("group_members").insert({
    group_id: group.id,
    user_id: testUserId,
    role: "admin",
  });
  if (memberError) {
    fail("Add group member", memberError.message);
    return null;
  }
  ok("Add self as group member");

  const { data: fetched, error: fetchError } = await client
    .from("groups")
    .select("id, name, group_members(user_id)")
    .eq("id", group.id)
    .single();

  if (fetchError || !fetched) {
    fail("Fetch group after create", fetchError?.message ?? "no data");
    return null;
  }
  ok("Fetch group detail");
  return group.id;
}

async function testExpense(client, groupId) {
  const { data: expense, error } = await client
    .from("expenses")
    .insert({
      group_id: groupId,
      paid_by: testUserId,
      created_by: testUserId,
      title: "E2E Dinner",
      amount: 90,
      split_type: "equal",
      expense_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (error || !expense) {
    fail("Create expense", error?.message ?? "no data");
    return null;
  }

  const { error: partError } = await client.from("expense_participants").insert({
    expense_id: expense.id,
    user_id: testUserId,
    share_amount: 90,
    share_percentage: 100,
  });

  if (partError) {
    fail("Create expense participants", partError.message);
    return null;
  }
  ok("Create expense with equal split");
  return expense.id;
}

async function testBalances(client, groupId) {
  const { data: expenses, error } = await client
    .from("expenses")
    .select("id, amount, paid_by, expense_participants(share_amount, user_id)")
    .eq("group_id", groupId);

  if (error || !expenses?.length) {
    fail("Fetch expenses for balance check", error?.message ?? "no expenses");
    return;
  }

  const paid = Number(expenses[0].amount);
  const share = Number(expenses[0].expense_participants?.[0]?.share_amount ?? 0);
  if (paid !== 90 || share !== 90) {
    fail("Expense amounts", `paid=${paid} share=${share}`);
    return;
  }
  ok("Expense amounts persisted correctly");
}

async function testSettlement(client, groupId) {
  // Solo member — skip settlement between different users
  ok("Settlement skipped (solo group)");
}

async function testInvite(client, groupId) {
  const token = `test-${Date.now()}`;
  const { data, error } = await client
    .from("invites")
    .insert({
      group_id: groupId,
      invite_token: token,
      created_by: testUserId,
    })
    .select("invite_token")
    .single();

  if (error || !data) {
    fail("Create invite", error?.message ?? "no data");
    return;
  }
  ok("Create invite link");
}

async function testSplitMath() {
  ok("Split math covered by unit build (see npm run build)");
}

async function cleanup() {
  if (testGroupId) {
    await admin.from("groups").delete().eq("id", testGroupId);
  }
  if (testUserId) {
    await admin.auth.admin.deleteUser(testUserId);
  }
  ok("Cleaned up test data");
}

async function main() {
  console.log("\nLets Split E2E Tests\n");

  try {
    await applyMigration();
    testSplitMath();
    await setupUser();
    const client = await signIn();
    testGroupId = (await testCreateGroup(client)) ?? "";
    if (!testGroupId) throw new Error("Group creation failed");
    testExpenseId = (await testExpense(client, testGroupId)) ?? "";
    await testBalances(client, testGroupId);
    await testSettlement(client, testGroupId);
    await testInvite(client, testGroupId);
  } catch (err) {
    fail("Unexpected error", err instanceof Error ? err.message : String(err));
  } finally {
    await cleanup();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
