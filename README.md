# Crafted MFG

Inventory, purchasing, and manufacturing tracking for Crafted MFG — a hat
manufacturing/distribution company. One Supabase backend serves a native iOS
app (Expo / React Native) and a responsive web app (Next.js).

## What's in Phase 1 (MVP — built)

- **Auth & roles** — email/password via Supabase Auth; `admin` / `manager` /
  `warehouse` roles enforced server-side with Row-Level Security on every table.
- **Suppliers** — CRUD for overseas hat manufacturers (admin/manager).
- **Catalog** — styles + variants with photo upload (camera/library on mobile,
  file picker on web), auto-generated unique SKUs (`CM-{STYLE}-{COLOR}-{NNN}`).
- **Inventory** — on-hand per variant; any role adjusts quantities with a
  required reason; every change appends to an immutable audit log
  (`inventory_adjustments`). Search/filter by style, color, supplier.
- **QuickBooks Online sync (one-way, app → QBO)** — Intuit OAuth 2.0, token
  storage + auto-refresh in edge functions, every quantity change pushed to the
  mapped QBO Item, all attempts logged with an admin retry view. Sandbox first.
- **Purchase orders / "On Order"** — POs with line items, photos, ETA,
  supplier, and current manufacturing stage at a glance.
- **Manufacturing stages** — manual stage pipeline
  (sampling → production → qc → ready_to_ship → shipped → delivered) with full
  who/when history and a visual stepper. Pipeline is configurable in
  `packages/shared/src/constants/stages.ts`.
- **Shipments (basic)** — carrier (UPS/FedEx/DHL), tracking number, manual
  status, ETA, deep link to the carrier tracking page.
- **Receive into stock** — one tap marks a PO received and adds all line-item
  quantities to inventory (audited + QBO-queued).
- **Barcode scanning** — print Code128 SKU labels from the web app; scan them
  with the phone camera to jump straight to a variant.
- **User invites** — admins invite staff by email from the web admin.

**Phase 2 (scaffolded, not built):** live UPS/FedEx/DHL tracking polling
(`supabase/functions/track-shipments`), push notifications (token registration
ships now; sending later). **Phase 3 (noted only):** patch product line (supplier `type`
already supports `patch_manufacturer`), reporting, multi-warehouse.

## Repo layout

```
apps/web            Next.js (App Router) responsive web app
apps/mobile         Expo / React Native iOS app (expo-router)
packages/shared     Types, zod schemas, SKU + stage config, Supabase data layer
supabase/
  migrations/       Schema, triggers/functions, RLS, storage bucket
  seed.sql          Demo suppliers/styles/variants/inventory/POs
  functions/        qbo-oauth, qbo-sync, track-shipments (Phase 2 stub)
scripts/seed-users.mjs   Creates demo admin/manager/warehouse users
```

## Prerequisites

- Node ≥ 20, pnpm ≥ 9 (`corepack enable`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- For iOS: Xcode + Simulator (or a device with Expo Go)

## Setup

```bash
pnpm install

# 1. Start Supabase locally (Postgres, Auth, Storage, Edge runtime)
supabase start            # prints API URL, anon key, service_role key

# 2. Apply migrations + seed data
supabase db reset         # runs migrations/ then seed.sql

# 3. Create demo users (admin@/manager@/warehouse@craftedmfg.test)
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<from supabase status> \
pnpm seed:users

# 4. Configure the apps
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local     # fill Supabase URL + anon key
cp apps/mobile/.env.example apps/mobile/.env           # fill Supabase URL + anon key
```

> Using a hosted Supabase project instead: create one at supabase.com, run
> `supabase link --project-ref <ref>` and `supabase db push`, run the seed SQL
> in the SQL editor, and point the env files at the hosted URL/keys.

## Running

```bash
pnpm dev                      # web + mobile via turbo, or individually:
pnpm --filter web dev         # http://localhost:3000
pnpm --filter mobile dev      # Expo dev server → press i for iOS simulator

supabase functions serve      # edge functions locally (qbo-oauth, qbo-sync)
```

Sign in with `admin@craftedmfg.test` / `crafted-demo-1234` (password set by
`SEED_USER_PASSWORD`).

## Environment variables

Every variable is listed with comments in [.env.example](./.env.example).
Summary:

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | `apps/web/.env.local` | Web client |
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | `apps/mobile/.env` | Mobile client |
| `SUPABASE_SERVICE_ROLE_KEY` | root `.env` / function secrets | Seed script + edge functions (never client-side) |
| `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` | Supabase function secrets | Intuit OAuth app keys (sandbox first) |
| `QBO_ENVIRONMENT` | function secrets | `sandbox` \| `production` |
| `QBO_REDIRECT_URI` | function secrets + Intuit app | `https://<ref>.functions.supabase.co/qbo-oauth/callback` |
| `QBO_APP_RETURN_URL` | function secrets | Where the browser lands after connecting |
| `UPS_CLIENT_ID/SECRET`, `DHL_API_KEY` | function secrets | **Phase 2** carrier polling — `TODO(creds)` |
| `SEED_USER_PASSWORD` | root `.env` | Demo user password |

Set function secrets with:
`supabase secrets set QBO_CLIENT_ID=... QBO_CLIENT_SECRET=... QBO_ENVIRONMENT=sandbox QBO_REDIRECT_URI=... QBO_APP_RETURN_URL=...`

## QuickBooks Online connect flow

1. Create an app at [developer.intuit.com](https://developer.intuit.com)
   (Accounting scope), add the redirect URI above, copy the **sandbox** keys.
2. Deploy functions: `supabase functions deploy qbo-oauth qbo-sync`.
3. In the web app as an admin: **Admin → QuickBooks → Connect** and authorize
   the sandbox company.
4. Adjust any inventory quantity — the new qty is pushed to the mapped QBO
   Item (the Item is created and mapped on first sync). Failures appear in the
   sync log with one-click retry.

Sync is strictly one-way (app → QBO); the app is the source of truth.

## Architecture notes

- **Audit-safe inventory:** all quantity changes go through the
  `adjust_inventory()` Postgres function — one transaction updates the qty,
  appends the audit row, and queues a QBO sync log entry. A DB trigger rejects
  any other write path to `qty_on_hand`, so the audit log cannot be bypassed.
- **Roles:** `public.users` mirrors `auth.users` via trigger; RLS policies use
  `current_user_role()`. Warehouse employees can read everything and adjust
  inventory, but cannot write catalog/POs/suppliers/settings.
- **Configurable in one place:** stage pipeline →
  `packages/shared/src/constants/stages.ts`; SKU scheme →
  `packages/shared/src/config/sku.ts`.
- **QBO tokens** live in the `qbo_connection` table with RLS enabled and zero
  policies — only edge functions (service role) can touch them.

## Open items (confirm when known)

- Trade Assurance usage per supplier (metadata only — `uses_trade_assurance`).
- Expo vs. pure Swift native — Expo ships a real App Store binary and shares
  the entire data layer with web; flag if Crafted requires SwiftUI.
- QBO production credentials before go-live (`TODO(creds)` markers in
  `supabase/functions/qbo-sync`).
- UPS/DHL developer accounts before Phase 2 (`TODO(creds)` in
  `supabase/functions/track-shipments`).
