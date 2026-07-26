#!/usr/bin/env node
/**
 * End-to-end integration tests against live Supabase.
 * Creates temporary test users, exercises core reliability flows, then cleans up.
 *
 * Skips cleanly when env vars are missing (unit suite still covers local logic).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars. Ensure .env.local is present.");
  console.error("Skipping live e2e — run unit tests with: npm test");
  process.exit(0);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const adminEmail = `e2e-admin-${stamp}@lets-split.test`;
const memberEmail = `e2e-member-${stamp}@lets-split.test`;
const outsiderEmail = `e2e-out-${stamp}@lets-split.test`;
const password = `Test-${stamp}!Aa`;

const ids = {
  adminUserId: "",
  memberUserId: "",
  outsiderUserId: "",
  groupId: "",
  expenseId: "",
};

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

async function applyMigration(filename) {
  const sql = readFileSync(join(__dirname, "../supabase/migrations", filename), "utf8");
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = url.match(/https:\/\/([^.]+)/)?.[1];
  if (!token || !ref) {
    console.log(`Skipping migration apply for ${filename} (no SUPABASE_ACCESS_TOKEN)`);
    return;
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Migration ${filename} failed: ${body}`);
  }
  ok(`Applied migration ${filename}`);
}

async function createUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  return data.user.id;
}

function userClient() {
  return createClient(url, anonKey);
}

async function signIn(email) {
  const client = userClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) throw new Error(error?.message ?? "signIn failed");
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function testAuthSignIn() {
  const client = await signIn(adminEmail);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    fail("Registration/sign-in", error?.message ?? "no user");
    return null;
  }
  ok("Registration/sign-in");
  return client;
}

async function testCreateGroupOnce(client) {
  const requestId = `idem-${randomBytes(8).toString("hex")}`;

  // Concurrent identical submissions must create exactly one group.
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      client.rpc("create_group_atomic", {
        p_name: "E2E Reliability Group",
        p_created_by: ids.adminUserId,
        p_client_request_id: requestId,
      })
    )
  );

  const rpcMissing = results.every(
    (r) =>
      r.error &&
      (r.error.code === "PGRST202" ||
        /create_group_atomic|could not find the function/i.test(r.error.message))
  );

  if (rpcMissing) {
    // App fails closed without migration 003 — do not exercise legacy inserts.
    fail(
      "Repeated create submission",
      "create_group_atomic missing; apply migration 003 before e2e"
    );
    return null;
  }

  const idsFromRpc = results
    .map((r) => r.data)
    .filter(Boolean);
  const unique = new Set(idsFromRpc);
  if (unique.size !== 1 || results.some((r) => r.error)) {
    fail(
      "Repeated create submission",
      results.find((r) => r.error)?.error?.message ??
        `unique=${unique.size}`
    );
    return idsFromRpc[0] ?? null;
  }

  ok("Repeated create submission creates exactly one group");
  return idsFromRpc[0];
}

async function testUnauthorizedAccess(outsiderClient, groupId) {
  const { data, error } = await outsiderClient
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .maybeSingle();

  if (data) {
    fail("Unauthorized access", "outsider could read group");
    return;
  }
  // RLS typically returns empty rather than throwing
  if (error && !/permission|row-level|policy/i.test(error.message)) {
    fail("Unauthorized access", error.message);
    return;
  }
  ok("Unauthorized access denied for outsider");
}

async function testMaliciousMembership(outsiderClient, memberClient, groupId) {
  // Self-join without invite
  const { error: selfJoinError } = await outsiderClient
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: ids.outsiderUserId,
      role: "member",
    });
  if (!selfJoinError) {
    fail("Malicious self-join without invite", "insert succeeded");
  } else {
    ok("Malicious self-join without invite denied");
  }

  // Member adding another user (after they joined via RPC)
  const { error: addOtherError } = await memberClient.from("group_members").insert({
    group_id: groupId,
    user_id: ids.outsiderUserId,
    role: "member",
  });
  if (!addOtherError) {
    fail("Malicious member-add-other", "insert succeeded");
  } else {
    ok("Malicious member-add-other denied");
  }

  // Self-promotion to admin
  const { error: promoteError } = await memberClient
    .from("group_members")
    .update({ role: "admin" })
    .eq("group_id", groupId)
    .eq("user_id", ids.memberUserId);
  if (!promoteError) {
    const { data: row } = await admin
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", ids.memberUserId)
      .maybeSingle();
    if (row?.role === "admin") {
      fail("Malicious self-promotion", "role became admin");
    } else {
      ok("Malicious self-promotion denied (no-op / blocked)");
    }
  } else {
    ok("Malicious self-promotion denied");
  }
}

async function testInviteFlows(adminClient, memberClient, outsiderClient, groupId) {
  const token = randomBytes(16).toString("hex");
  const { data: invite, error } = await adminClient
    .from("invites")
    .insert({
      group_id: groupId,
      invite_token: token,
      created_by: ids.adminUserId,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    .select("invite_token")
    .single();

  if (error || !invite) {
    fail("Admin invite success", error?.message ?? "no data");
    return;
  }
  ok("Admin invite success");

  // Join via accept_invite RPC (not direct group_members insert)
  const { data: joinedGroupId, error: joinError } = await memberClient.rpc(
    "accept_invite",
    { p_token: token }
  );
  if (joinError || joinedGroupId !== groupId) {
    fail("Invite/join via accept_invite RPC", joinError?.message ?? "no group id");
  } else {
    ok("Invite/join via accept_invite RPC");
  }

  // Ordinary member should be denied creating invites
  const { error: memberInviteError } = await memberClient.from("invites").insert({
    group_id: groupId,
    invite_token: randomBytes(16).toString("hex"),
    created_by: ids.memberUserId,
  });
  if (!memberInviteError) {
    fail("Ordinary-member invite denial", "member was able to create invite");
  } else {
    ok("Ordinary-member invite denial");
  }

  // Duplicate invite token
  const { error: dupError } = await adminClient.from("invites").insert({
    group_id: groupId,
    invite_token: token,
    created_by: ids.adminUserId,
  });
  if (!dupError) {
    fail("Duplicate invite", "duplicate token allowed");
  } else {
    ok("Duplicate invite rejected");
  }

  // Expired invite rejected by RPC
  const expiredToken = randomBytes(16).toString("hex");
  await adminClient.from("invites").insert({
    group_id: groupId,
    invite_token: expiredToken,
    created_by: ids.adminUserId,
    expires_at: new Date(Date.now() - 1000).toISOString(),
  });
  const { error: expiredError } = await outsiderClient.rpc("accept_invite", {
    p_token: expiredToken,
  });
  if (!expiredError) {
    fail("Expired invite", "accept_invite succeeded");
  } else {
    ok("Expired/invalid invite rejected by RPC");
  }

  // Existing member re-accept is idempotent via RPC
  const token2 = randomBytes(16).toString("hex");
  await adminClient.from("invites").insert({
    group_id: groupId,
    invite_token: token2,
    created_by: ids.adminUserId,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  const { error: rejoinError } = await memberClient.rpc("accept_invite", {
    p_token: token2,
  });
  if (rejoinError) {
    fail("Existing-member behaviour", rejoinError.message);
  } else {
    ok("Existing-member behaviour");
  }
}

async function testExpense(client, groupId) {
  const { data: expense, error } = await client
    .from("expenses")
    .insert({
      group_id: groupId,
      paid_by: ids.adminUserId,
      created_by: ids.adminUserId,
      title: "E2E Dinner",
      amount: 100,
      split_type: "equal",
      expense_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (error || !expense) {
    fail("Add expense", error?.message ?? "no data");
    return null;
  }

  const { error: partError } = await client.from("expense_participants").insert([
    {
      expense_id: expense.id,
      user_id: ids.adminUserId,
      share_amount: 50,
      share_percentage: 50,
    },
    {
      expense_id: expense.id,
      user_id: ids.memberUserId,
      share_amount: 50,
      share_percentage: 50,
    },
  ]);

  if (partError) {
    fail("Add expense participants", partError.message);
    return null;
  }
  ok("Add expense");

  // Edit expense
  const { error: updateError } = await client
    .from("expenses")
    .update({ title: "E2E Dinner (edited)", amount: 90 })
    .eq("id", expense.id);
  if (updateError) {
    fail("Edit expense", updateError.message);
  } else {
    ok("Edit expense");
  }

  return expense.id;
}

async function testDeleteExpense(client, expenseId) {
  if (!expenseId) {
    fail("Delete expense", "no expense id");
    return;
  }
  const { error } = await client.from("expenses").delete().eq("id", expenseId);
  if (error) {
    fail("Delete expense", error.message);
    return;
  }
  ok("Delete expense");
}

async function testDeleteGroup(client, groupId) {
  const { error } = await client.from("groups").delete().eq("id", groupId);
  if (error) {
    // Creators can update; delete may require being creator with cascade
    // Try via admin service for cleanup assertion of app policy separately
    fail("Delete group", error.message);
    return;
  }
  ids.groupId = "";
  ok("Delete group");
}

async function cleanup() {
  if (ids.groupId) {
    await admin.from("groups").delete().eq("id", ids.groupId);
  }
  for (const userId of [
    ids.adminUserId,
    ids.memberUserId,
    ids.outsiderUserId,
  ]) {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
  ok("Cleaned up test data");
}

async function main() {
  console.log("\nLets Split Reliability E2E Tests\n");

  try {
    await applyMigration("002_fix_group_rls.sql");
    await applyMigration("003_reliability.sql");

    ids.adminUserId = await createUser(adminEmail);
    ids.memberUserId = await createUser(memberEmail);
    ids.outsiderUserId = await createUser(outsiderEmail);
    ok("Created temporary users");

    const adminClient = await testAuthSignIn();
    if (!adminClient) throw new Error("Admin sign-in failed");

    const memberClient = await signIn(memberEmail);
    const outsiderClient = await signIn(outsiderEmail);
    ok("Member and outsider signed in");

    ids.groupId = (await testCreateGroupOnce(adminClient)) ?? "";
    if (!ids.groupId) throw new Error("Group creation failed");

    await testUnauthorizedAccess(outsiderClient, ids.groupId);
    await testInviteFlows(adminClient, memberClient, outsiderClient, ids.groupId);
    await testMaliciousMembership(outsiderClient, memberClient, ids.groupId);
    ids.expenseId = (await testExpense(adminClient, ids.groupId)) ?? "";
    await testDeleteExpense(adminClient, ids.expenseId);
    await testDeleteGroup(adminClient, ids.groupId);
  } catch (err) {
    fail("Unexpected error", err instanceof Error ? err.message : String(err));
  } finally {
    await cleanup();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
