import type { SupabaseClient } from "@supabase/supabase-js";
import type { PurchaseOrderRow, PurchaseOrderWithRelations } from "../types/database";
import type { PurchaseOrderInput } from "../schemas";

const PO_SELECT =
  "*, supplier:suppliers(*), line_items:po_line_items(*, variant:variants(*, style:styles(*))), stage_events:manufacturing_stage_events(*), shipments(*)";

export async function listPurchaseOrders(
  supabase: SupabaseClient,
  opts: { includeClosed?: boolean } = {},
): Promise<PurchaseOrderWithRelations[]> {
  let q = supabase
    .from("purchase_orders")
    .select(PO_SELECT)
    .order("order_date", { ascending: false })
    .order("created_at", { referencedTable: "manufacturing_stage_events", ascending: false });
  if (!opts.includeClosed) q = q.not("status", "in", "(received,cancelled)");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PurchaseOrderWithRelations[];
}

export async function getPurchaseOrder(
  supabase: SupabaseClient,
  id: string,
): Promise<PurchaseOrderWithRelations> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(PO_SELECT)
    .eq("id", id)
    .order("created_at", { referencedTable: "manufacturing_stage_events", ascending: false })
    .single();
  if (error) throw error;
  return data as unknown as PurchaseOrderWithRelations;
}

export async function createPurchaseOrder(
  supabase: SupabaseClient,
  input: PurchaseOrderInput,
): Promise<PurchaseOrderRow> {
  const { line_items, ...po } = input;
  const { data, error } = await supabase.from("purchase_orders").insert(po).select().single();
  if (error) throw error;
  const created = data as PurchaseOrderRow;

  const { error: liError } = await supabase
    .from("po_line_items")
    .insert(line_items.map((li) => ({ ...li, po_id: created.id })));
  if (liError) {
    // Best-effort rollback so a failed line-item insert doesn't leave an empty PO.
    await supabase.from("purchase_orders").delete().eq("id", created.id);
    throw liError;
  }
  return created;
}

export async function updatePurchaseOrder(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Omit<PurchaseOrderInput, "line_items">>,
): Promise<PurchaseOrderRow> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PurchaseOrderRow;
}

/** Replaces all line items on a PO (simplest correct MVP semantics for edits). */
export async function replaceLineItems(
  supabase: SupabaseClient,
  poId: string,
  lineItems: PurchaseOrderInput["line_items"],
): Promise<void> {
  const { error: delError } = await supabase.from("po_line_items").delete().eq("po_id", poId);
  if (delError) throw delError;
  const { error } = await supabase
    .from("po_line_items")
    .insert(lineItems.map((li) => ({ ...li, po_id: poId })));
  if (error) throw error;
}

export interface ReceivePoResult {
  received_items: number;
  /** qbo_sync_log rows queued by the RPC; pass each to syncInventoryToQbo. */
  sync_log_ids: string[];
}

/**
 * Atomically marks the PO received and adds every line item qty to inventory
 * (audit rows + QBO sync queue included) via the receive_purchase_order RPC.
 * Admin/manager only — enforced in the database.
 */
export async function receivePurchaseOrder(
  supabase: SupabaseClient,
  poId: string,
): Promise<ReceivePoResult> {
  const { data, error } = await supabase.rpc("receive_purchase_order", { p_po_id: poId });
  if (error) throw error;
  return data as ReceivePoResult;
}

/** Latest stage event per PO = the PO's current manufacturing stage. */
export function currentStage(po: PurchaseOrderWithRelations): string | null {
  if (!po.stage_events.length) return null;
  const sorted = [...po.stage_events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return sorted[0]?.stage ?? null;
}
