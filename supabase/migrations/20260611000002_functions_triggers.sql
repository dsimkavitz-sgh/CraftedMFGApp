-- Crafted MFG — functions & triggers

-- ── Role helper (used by every RLS policy) ───────────────────────────────────
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_staff_writer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'manager');
$$;

-- ── Mirror auth.users → public.users ────────────────────────────────────────
-- Role can be preset via raw_user_meta_data.role (used by the seed script);
-- defaults to 'warehouse' (least privilege) — an admin promotes from there.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'warehouse')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Auto-create a zeroed inventory row per variant ───────────────────────────
create or replace function public.handle_new_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.inventory (variant_id, qty_on_hand)
  values (new.id, 0)
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

create trigger on_variant_created
  after insert on public.variants
  for each row execute function public.handle_new_variant();

-- ── Guard: qty_on_hand may only change via adjust_inventory() ────────────────
-- Keeps the inventory_adjustments audit log complete: any path that skips the
-- RPC (including service role) is rejected.
create or replace function public.guard_inventory_qty()
returns trigger
language plpgsql
as $$
begin
  if new.qty_on_hand is distinct from old.qty_on_hand
     and coalesce(current_setting('app.inventory_rpc', true), '') <> 'on' then
    raise exception 'qty_on_hand can only be changed via the adjust_inventory() function';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_inventory_qty
  before update on public.inventory
  for each row execute function public.guard_inventory_qty();

-- ── adjust_inventory: atomic qty change + audit row + QBO sync queue ─────────
-- Returns { new_qty, adjustment_id, sync_log_id }. The client then invokes the
-- qbo-sync edge function with sync_log_id; rows left 'pending' (or 'error')
-- surface in the admin retry view, so nothing is silently lost.
create or replace function public.adjust_inventory(
  p_variant_id uuid,
  p_delta integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_new_qty integer;
  v_adjustment_id uuid;
  v_sync_log_id uuid;
  v_sku text;
begin
  v_role := public.current_user_role();
  if v_role is null then
    raise exception 'Not authorized';
  end if;
  if p_delta = 0 then
    raise exception 'Quantity change cannot be zero';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required for every inventory adjustment';
  end if;

  perform set_config('app.inventory_rpc', 'on', true);

  update public.inventory
     set qty_on_hand = qty_on_hand + p_delta
   where variant_id = p_variant_id
  returning qty_on_hand into v_new_qty;

  if v_new_qty is null then
    raise exception 'No inventory row for variant %', p_variant_id;
  end if;

  insert into public.inventory_adjustments (variant_id, delta, new_qty, reason, user_id)
  values (p_variant_id, p_delta, v_new_qty, trim(p_reason), auth.uid())
  returning id into v_adjustment_id;

  select sku into v_sku from public.variants where id = p_variant_id;

  insert into public.qbo_sync_log (entity, action, status, payload)
  values (
    'variant', 'update_quantity', 'pending',
    jsonb_build_object('variant_id', p_variant_id, 'sku', v_sku, 'new_qty', v_new_qty)
  )
  returning id into v_sync_log_id;

  return jsonb_build_object(
    'new_qty', v_new_qty,
    'adjustment_id', v_adjustment_id,
    'sync_log_id', v_sync_log_id
  );
end;
$$;

-- All three roles may adjust inventory (warehouse included).
revoke all on function public.adjust_inventory(uuid, integer, text) from public;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;

-- ── Append-only protection for audit/history tables ───────────────────────────
create or replace function public.forbid_change()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger inventory_adjustments_append_only
  before update or delete on public.inventory_adjustments
  for each row execute function public.forbid_change();
