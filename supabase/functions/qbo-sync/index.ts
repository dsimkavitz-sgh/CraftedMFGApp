// One-way inventory sync: app → QuickBooks Online. App is the source of truth.
//
// POST { sync_log_id } (any authenticated staff JWT; admin uses the same call
// to retry failures from the sync-log view).
//
// Flow per pending/error log row (queued by the adjust_inventory RPC):
//  1. Load the variant + current qty (always sync the LATEST qty, not the
//     qty at enqueue time — later adjustments supersede earlier ones).
//  2. Ensure the variant is mapped to a QBO Item (create an Inventory Item
//     and store variants.qbo_entity_id on first sync).
//  3. Sparse-update the Item's QtyOnHand.
//  4. Mark the log row success/error with details. Failures surface in the
//     admin view with retry.
import { getFreshConnection, json, corsHeaders, qboRequest, serviceClient, callerRole } from "../_shared/qbo.ts";
import type { QboConnection } from "../_shared/qbo.ts";

interface SyncPayload {
  variant_id: string;
  sku: string;
  new_qty: number;
}

async function findOrCreateQboItem(
  conn: QboConnection,
  supabase: ReturnType<typeof serviceClient>,
  variant: { id: string; sku: string; color: string; size: string; qbo_entity_id: string | null; style_name: string },
): Promise<string> {
  if (variant.qbo_entity_id) return variant.qbo_entity_id;

  // Try to find an existing Item by name (SKU) before creating one.
  const escapedSku = variant.sku.replace(/'/g, "\\'");
  const found = await qboRequest(
    conn,
    "GET",
    `/query?query=${encodeURIComponent(`select * from Item where Name = '${escapedSku}'`)}`,
  );
  const existing = (found as {
    QueryResponse?: { Item?: Array<{ Id: string }> };
  }).QueryResponse?.Item?.[0];

  let itemId: string;
  if (existing) {
    itemId = existing.Id;
  } else {
    // QBO inventory items require income/asset/COGS accounts. Sandbox default
    // account ids are used here; production mapping is confirmed at go-live.
    // TODO(creds): verify account ids against the production QBO chart of
    // accounts before enabling QBO_ENVIRONMENT=production.
    const created = await qboRequest(conn, "POST", "/item", {
      Name: variant.sku,
      Description: `${variant.style_name} — ${variant.color} / ${variant.size}`,
      Type: "Inventory",
      TrackQtyOnHand: true,
      QtyOnHand: 0,
      InvStartDate: new Date().toISOString().slice(0, 10),
      IncomeAccountRef: { value: "79" }, // Sales of Product Income (sandbox)
      AssetAccountRef: { value: "81" }, // Inventory Asset (sandbox)
      ExpenseAccountRef: { value: "80" }, // Cost of Goods Sold (sandbox)
    });
    itemId = (created as { Item: { Id: string } }).Item.Id;
  }

  const { error } = await supabase
    .from("variants")
    .update({ qbo_entity_id: itemId })
    .eq("id", variant.id);
  if (error) throw error;
  return itemId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = serviceClient();
  let logId: string | null = null;

  try {
    const role = await callerRole(req);
    if (!role) return json({ error: "Not authorized" }, 401);

    const body = await req.json().catch(() => ({}));
    logId = body.sync_log_id ?? null;
    if (!logId) return json({ error: "sync_log_id is required" }, 400);

    const { data: logRow, error: logError } = await supabase
      .from("qbo_sync_log")
      .select("*")
      .eq("id", logId)
      .single();
    if (logError) throw logError;
    if (logRow.entity !== "variant" || logRow.action !== "update_quantity") {
      return json({ error: "This log entry is not a retryable inventory sync" }, 400);
    }
    if (logRow.status === "success") return json({ ok: true, skipped: "already synced" });

    const payload = logRow.payload as SyncPayload;
    const { data: variant, error: vError } = await supabase
      .from("variants")
      .select("id, sku, color, size, qbo_entity_id, style:styles(name), inventory(qty_on_hand)")
      .eq("id", payload.variant_id)
      .single();
    if (vError) throw vError;

    const currentQty =
      (variant.inventory as { qty_on_hand: number } | null)?.qty_on_hand ?? payload.new_qty;
    const styleName = (variant.style as { name: string } | null)?.name ?? "Crafted MFG";

    const conn = await getFreshConnection(supabase);
    const itemId = await findOrCreateQboItem(conn, supabase, {
      id: variant.id,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      qbo_entity_id: variant.qbo_entity_id,
      style_name: styleName,
    });

    // Sparse update needs the current SyncToken.
    const itemRes = await qboRequest(conn, "GET", `/item/${itemId}`);
    const item = (itemRes as { Item: { Id: string; SyncToken: string } }).Item;
    await qboRequest(conn, "POST", "/item", {
      Id: item.Id,
      SyncToken: item.SyncToken,
      sparse: true,
      QtyOnHand: currentQty,
    });

    await supabase
      .from("qbo_sync_log")
      .update({
        status: "success",
        qbo_entity_id: itemId,
        error: null,
        payload: { ...payload, synced_qty: currentQty },
      })
      .eq("id", logId);

    return json({ ok: true, qbo_item_id: itemId, synced_qty: currentQty });
  } catch (err) {
    console.error("qbo-sync error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    if (logId) {
      await supabase
        .from("qbo_sync_log")
        .update({ status: "error", error: message })
        .eq("id", logId);
    }
    return json({ error: message }, 500);
  }
});
