#!/usr/bin/env node
/**
 * Creates three demo users (admin / manager / warehouse) via the Supabase
 * Admin API. Run after migrations + seed.sql:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm seed:users
 *
 * For local dev (`supabase start`) the URL is http://127.0.0.1:54321 and the
 * service-role key is printed by `supabase status`.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USER_PASSWORD ?? "crafted-demo-1234";

if (!serviceRoleKey) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY (see `supabase status` for local dev).");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  { email: "admin@craftedmfg.test", full_name: "Avery Admin", role: "admin" },
  { email: "manager@craftedmfg.test", full_name: "Morgan Manager", role: "manager" },
  { email: "warehouse@craftedmfg.test", full_name: "Wes Warehouse", role: "warehouse" },
];

for (const u of demoUsers) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error) {
    if (`${error.message}`.toLowerCase().includes("already")) {
      console.log(`= ${u.email} already exists, skipping`);
      continue;
    }
    console.error(`✗ ${u.email}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  // The on_auth_user_created trigger mirrors the row into public.users with
  // the role from user_metadata; assert it landed.
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();
  console.log(`✓ ${u.email} (${profile?.role ?? "role pending"}) — password: ${password}`);
}

console.log("\nDemo sign-ins ready. Change SEED_USER_PASSWORD for anything non-local.");
