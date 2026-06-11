-- Crafted MFG — Row Level Security
-- Roles: admin (full), manager (everything but user mgmt / destructive
-- settings), warehouse (read + inventory adjustments via RPC only).

alter table public.users enable row level security;
alter table public.suppliers enable row level security;
alter table public.styles enable row level security;
alter table public.variants enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_line_items enable row level security;
alter table public.manufacturing_stage_events enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.push_tokens enable row level security;
alter table public.qbo_sync_log enable row level security;
alter table public.qbo_connection enable row level security;
alter table public.qbo_oauth_states enable row level security;
-- qbo_connection / qbo_oauth_states: RLS on, zero policies → service role
-- (edge functions) only.

-- ── users ────────────────────────────────────────────────────────────────────
create policy "users: read own profile" on public.users
  for select using (id = auth.uid());
create policy "users: admin reads all" on public.users
  for select using (public.current_user_role() = 'admin');
create policy "users: admin updates roles" on public.users
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy "users: admin deletes" on public.users
  for delete using (public.current_user_role() = 'admin');
-- inserts happen via the on_auth_user_created trigger (security definer)

-- staff-visible directory names (for audit/stage attribution) are exposed via
-- the joins users make through security-definer reads below; warehouse and
-- managers still need to read names of other users for history views:
create policy "users: staff read directory" on public.users
  for select using (public.current_user_role() in ('manager', 'warehouse'));

-- ── suppliers / catalog: read for all staff, write for admin+manager ─────────
create policy "suppliers: read" on public.suppliers
  for select using (auth.uid() is not null);
create policy "suppliers: write" on public.suppliers
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

create policy "styles: read" on public.styles
  for select using (auth.uid() is not null);
create policy "styles: write" on public.styles
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

create policy "variants: read" on public.variants
  for select using (auth.uid() is not null);
create policy "variants: write" on public.variants
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

-- ── inventory ────────────────────────────────────────────────────────────────
-- qty_on_hand changes are blocked by the guard trigger outside
-- adjust_inventory(); this update policy effectively covers `location` edits.
create policy "inventory: read" on public.inventory
  for select using (auth.uid() is not null);
create policy "inventory: staff update" on public.inventory
  for update using (public.is_staff_writer()) with check (public.is_staff_writer());
create policy "inventory: staff insert" on public.inventory
  for insert with check (public.is_staff_writer());

-- Append-only audit log: readable by everyone signed in, written only by the
-- adjust_inventory() security-definer function (no insert policy needed).
create policy "inventory_adjustments: read" on public.inventory_adjustments
  for select using (auth.uid() is not null);

-- ── purchase orders ──────────────────────────────────────────────────────────
create policy "purchase_orders: read" on public.purchase_orders
  for select using (auth.uid() is not null);
create policy "purchase_orders: write" on public.purchase_orders
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

create policy "po_line_items: read" on public.po_line_items
  for select using (auth.uid() is not null);
create policy "po_line_items: write" on public.po_line_items
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

-- ── manufacturing stage events (append-only history) ─────────────────────────
create policy "stage_events: read" on public.manufacturing_stage_events
  for select using (auth.uid() is not null);
create policy "stage_events: staff insert" on public.manufacturing_stage_events
  for insert with check (
    public.is_staff_writer() and (updated_by is null or updated_by = auth.uid())
  );

alter table public.manufacturing_stage_events
  alter column updated_by set default auth.uid();

-- ── shipments ────────────────────────────────────────────────────────────────
create policy "shipments: read" on public.shipments
  for select using (auth.uid() is not null);
create policy "shipments: write" on public.shipments
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

-- Phase 2: written by the track-shipments edge function (service role).
create policy "shipment_events: read" on public.shipment_events
  for select using (auth.uid() is not null);

-- ── push tokens: each user manages their own ─────────────────────────────────
create policy "push_tokens: own rows" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── QBO sync log: admin-visible; written by RPC + edge functions ─────────────
create policy "qbo_sync_log: admin read" on public.qbo_sync_log
  for select using (public.current_user_role() = 'admin');
