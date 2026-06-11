-- Crafted MFG — initial schema
-- Hat manufacturing/distribution: catalog, inventory, POs, manufacturing
-- stages, shipments, QBO sync, push tokens.

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type public.user_role as enum ('admin', 'manager', 'warehouse');
create type public.supplier_type as enum ('hat_manufacturer', 'patch_manufacturer');
create type public.po_status as enum ('draft', 'ordered', 'in_production', 'shipped', 'received', 'cancelled');
create type public.carrier as enum ('ups', 'dhl');
create type public.sync_status as enum ('pending', 'success', 'error');

-- ── Users (mirror of auth.users, holds the app role) ────────────────────────
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'warehouse',
  created_at timestamptz not null default now()
);

-- ── Suppliers ────────────────────────────────────────────────────────────────
-- type already includes patch_manufacturer for Phase 3 patch tracking.
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.supplier_type not null default 'hat_manufacturer',
  country text,
  alibaba_reference text,
  uses_trade_assurance boolean,
  contact_notes text,
  created_at timestamptz not null default now()
);

-- ── Catalog: styles + variants ───────────────────────────────────────────────
create table public.styles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  supplier_id uuid references public.suppliers (id) on delete set null,
  hero_photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index styles_supplier_id_idx on public.styles (supplier_id);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  style_id uuid not null references public.styles (id) on delete cascade,
  color text not null,
  size text not null,
  -- App-generated, scheme in packages/shared/src/config/sku.ts
  sku text not null unique,
  -- Reserved for Phase 2 Code128 generation; null in MVP
  barcode text unique,
  photo_url text,
  -- QuickBooks Online Item id once mapped (variants <-> QBO Items)
  qbo_entity_id text,
  created_at timestamptz not null default now()
);
create index variants_style_id_idx on public.variants (style_id);

-- ── Inventory + append-only audit log ────────────────────────────────────────
create table public.inventory (
  variant_id uuid primary key references public.variants (id) on delete cascade,
  qty_on_hand integer not null default 0 check (qty_on_hand >= 0),
  location text,
  updated_at timestamptz not null default now()
);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants (id) on delete cascade,
  delta integer not null,
  new_qty integer not null,
  reason text not null,
  user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_adjustments_variant_id_idx on public.inventory_adjustments (variant_id, created_at desc);

-- ── Purchase orders ──────────────────────────────────────────────────────────
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  order_date date not null default current_date,
  eta date,
  status public.po_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now()
);
create index purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);
create index purchase_orders_status_idx on public.purchase_orders (status);

create table public.po_line_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  variant_id uuid not null references public.variants (id) on delete restrict,
  qty integer not null check (qty > 0),
  unit_cost numeric(10, 2)
);
create index po_line_items_po_id_idx on public.po_line_items (po_id);

-- ── Manufacturing stage events (append-only; latest row = current stage) ─────
-- stage is text on purpose: the pipeline is configurable in
-- packages/shared/src/constants/stages.ts without a migration.
create table public.manufacturing_stage_events (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  stage text not null,
  note text,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index manufacturing_stage_events_po_id_idx on public.manufacturing_stage_events (po_id, created_at desc);

-- ── Shipments (MVP: manual status + deep link; Phase 2: live polling) ────────
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  carrier public.carrier not null,
  tracking_number text not null,
  status text not null default 'pending',
  eta date,
  last_event_summary text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index shipments_po_id_idx on public.shipments (po_id);

-- Phase 2 — populated by the track-shipments edge function. Unpopulated in MVP.
create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  code text,
  description text,
  location text,
  occurred_at timestamptz not null
);
create index shipment_events_shipment_id_idx on public.shipment_events (shipment_id, occurred_at desc);

-- ── Push tokens (Phase 2 notifications; registration ships in MVP) ───────────
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  expo_token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (user_id, expo_token)
);

-- ── QuickBooks Online sync ────────────────────────────────────────────────────
create table public.qbo_sync_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  action text not null,
  status public.sync_status not null default 'pending',
  qbo_entity_id text,
  payload jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index qbo_sync_log_status_idx on public.qbo_sync_log (status, created_at desc);

-- Short-lived CSRF state for the Intuit OAuth connect flow. Service-role only.
create table public.qbo_oauth_states (
  state uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- OAuth tokens for the connected QBO company. Service-role only (RLS enabled,
-- zero policies) — only edge functions read/write it.
create table public.qbo_connection (
  id integer primary key default 1 check (id = 1), -- singleton row
  realm_id text not null,
  environment text not null default 'sandbox',
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
