import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const key = m[1].trim();
  const value = m[2].trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stamp = Date.now();
const email = `shot-admin-${stamp}@lets-split.test`;
const password = `Shot-Admin-${stamp}!Aa`;

mkdirSync("/opt/cursor/artifacts/screenshots", { recursive: true });

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cleanup leftovers
const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
for (const u of listed?.users ?? []) {
  if (u.email?.startsWith("shot-admin-") && u.email.endsWith("@lets-split.test")) {
    await admin.from("groups").delete().eq("created_by", u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
}

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createErr || !created.user) throw new Error(createErr?.message ?? "createUser");
const userId = created.user.id;
await admin.from("profiles").upsert({
  id: userId,
  email,
  full_name: "Screenshot Admin",
});

const { data: group, error: groupErr } = await admin
  .from("groups")
  .insert({ name: "Akl group 1", created_by: userId })
  .select("id")
  .single();
if (groupErr || !group) throw new Error(groupErr?.message ?? "group");
await admin.from("group_members").insert({
  group_id: group.id,
  user_id: userId,
  role: "admin",
});

const jar = [];
const supabase = createServerClient(url, anon, {
  cookies: {
    getAll: () => jar.map((c) => ({ name: c.name, value: c.value })),
    setAll: (items) => {
      for (const item of items) {
        const idx = jar.findIndex((c) => c.name === item.name);
        if (idx >= 0) jar[idx] = item;
        else jar.push(item);
      }
    },
  },
});

const { error: signErr } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (signErr) throw new Error(signErr.message);
if (!jar.length) throw new Error("No auth cookies produced");

console.log(
  "Prepared",
  email,
  group.id,
  jar.map((c) => c.name)
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});
await context.addCookies(
  jar.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }))
);

const page = await context.newPage();
await page.goto("http://127.0.0.1:3000/dashboard", { waitUntil: "networkidle" });
console.log("Dashboard URL", page.url());
await page.waitForSelector("text=Your groups", {
  timeout: 20000,
  state: "attached",
});
await page.waitForSelector('button[aria-label*="Delete group"]', {
  timeout: 10000,
  state: "attached",
});

await page.screenshot({
  path: "/opt/cursor/artifacts/screenshots/dashboard-delete-button.png",
  fullPage: true,
});
console.log("Saved dashboard-delete-button.png");

await page.goto(`http://127.0.0.1:3000/groups/${group.id}`, {
  waitUntil: "networkidle",
});
await page.waitForSelector("text=Delete this group", { state: "attached" });
await page.screenshot({
  path: "/opt/cursor/artifacts/screenshots/group-delete-section.png",
  fullPage: true,
});
console.log("Saved group-delete-section.png");

await page.goto("http://127.0.0.1:3000/dashboard", { waitUntil: "networkidle" });
const deleteBtn = page.getByRole("button", { name: /delete group akl group 1/i });
await deleteBtn.click({ force: true });
await page.waitForSelector("text=Confirm delete", { state: "attached" });
await page.screenshot({
  path: "/opt/cursor/artifacts/screenshots/dashboard-delete-confirm.png",
  fullPage: true,
});
console.log("Saved dashboard-delete-confirm.png");

await browser.close();
await admin.from("groups").delete().eq("id", group.id);
await admin.auth.admin.deleteUser(userId);
console.log("Cleaned up");
