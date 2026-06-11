-- Receive a purchase order into stock: atomically marks the PO received and
-- adds every line item's qty to inventory, writing the audit rows and QBO
-- sync queue entries exactly like adjust_inventory() does.
create or replace function public.receive_purchase_order(p_po_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_li record;
  v_new_qty integer;
  v_sync_log_id uuid;
  v_sync_log_ids uuid[] := '{}';
  v_items integer := 0;
begin
  if not public.is_staff_writer() then
    raise exception 'Only admins and managers can receive purchase orders';
  end if;

  select * into v_po from public.purchase_orders where id = p_po_id for update;
  if v_po.id is null then
    raise exception 'Purchase order % not found', p_po_id;
  end if;
  if v_po.status in ('received', 'cancelled') then
    raise exception 'PO % is already %', v_po.po_number, v_po.status;
  end if;

  perform set_config('app.inventory_rpc', 'on', true);

  for v_li in
    select li.variant_id, li.qty, v.sku
      from public.po_line_items li
      join public.variants v on v.id = li.variant_id
     where li.po_id = p_po_id
  loop
    update public.inventory
       set qty_on_hand = qty_on_hand + v_li.qty
     where variant_id = v_li.variant_id
    returning qty_on_hand into v_new_qty;

    if v_new_qty is null then
      raise exception 'No inventory row for variant %', v_li.sku;
    end if;

    insert into public.inventory_adjustments (variant_id, delta, new_qty, reason, user_id)
    values (v_li.variant_id, v_li.qty, v_new_qty,
            'Received ' || v_po.po_number, auth.uid());

    insert into public.qbo_sync_log (entity, action, status, payload)
    values ('variant', 'update_quantity', 'pending',
            jsonb_build_object('variant_id', v_li.variant_id, 'sku', v_li.sku, 'new_qty', v_new_qty))
    returning id into v_sync_log_id;

    v_sync_log_ids := v_sync_log_ids || v_sync_log_id;
    v_items := v_items + 1;
  end loop;

  update public.purchase_orders set status = 'received' where id = p_po_id;

  return jsonb_build_object(
    'received_items', v_items,
    'sync_log_ids', to_jsonb(v_sync_log_ids)
  );
end;
$$;

revoke all on function public.receive_purchase_order(uuid) from public;
grant execute on function public.receive_purchase_order(uuid) to authenticated;
