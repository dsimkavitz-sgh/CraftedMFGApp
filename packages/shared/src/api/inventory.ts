import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdjustmentWithRelations,
  InventoryListItem,
} from "../types/database";
import type { InventoryAdjustmentInput } from "../schemas";

export interface InventoryFilters {
  search?: string;
  styleId?: string;
  supplierId?: string;
  color?: string;
}

export async function listInventory(
  supabase: SupabaseClient,
  filters: InventoryFilters = {},
): Promise<InventoryListItem[]> {
  let q = supabase
    .from("variants")
    .select("*, inventory(*), style:styles!inner(*, supplier:suppliers(*))")
    .order("sku");
  if (filters.styleId) q = q.eq("style_id", filters.styleId);
  if (filters.supplierId) q = q.eq("style.supplier_id", filters.supplierId);
  if (filters.color) q = q.ilike("color", `%${filters.color}%`);
  if (filters.search) {
    const s = filters.search.replace(/[%,()]/g, "");
    q = q.or(`sku.ilike.%${s}%,color.ilike.%${s}%,size.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as InventoryListItem[];
}

export interface AdjustInventoryResult {
  new_qty: number;
  adjustment_id: string;
  /** qbo_sync_log row created by the RPC; pass to syncInventoryToQbo. */
  sync_log_id: string | null;
}

/**
 * Atomically adjusts qty_on_hand, appends the audit row, and queues a QBO
 * sync log entry — all in one transaction via the adjust_inventory RPC.
 * Direct writes to inventory.qty_on_hand are blocked by a DB trigger.
 */
export async function adjustInventory(
  supabase: SupabaseClient,
  input: InventoryAdjustmentInput,
): Promise<AdjustInventoryResult> {
  const { data, error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: input.variant_id,
    p_delta: input.delta,
    p_reason: input.reason,
  });
  if (error) throw error;
  return data as AdjustInventoryResult;
}

/**
 * Fire-and-forget push of the latest quantity to QuickBooks Online.
 * Failures land in qbo_sync_log and surface in the admin retry view,
 * so callers should not block the UI on this.
 */
export async function syncInventoryToQbo(
  supabase: SupabaseClient,
  syncLogId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke("qbo-sync", {
    body: { sync_log_id: syncLogId },
  });
  if (error) throw error;
}

export async function listAdjustments(
  supabase: SupabaseClient,
  opts: { variantId?: string; limit?: number } = {},
): Promise<AdjustmentWithRelations[]> {
  let q = supabase
    .from("inventory_adjustments")
    .select("*, user:users(id, full_name, email), variant:variants(id, sku, color, size)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.variantId) q = q.eq("variant_id", opts.variantId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AdjustmentWithRelations[];
}

export async function updateInventoryLocation(
  supabase: SupabaseClient,
  variantId: string,
  location: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("inventory")
    .update({ location })
    .eq("variant_id", variantId);
  if (error) throw error;
}
