import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShipmentEventRow, ShipmentRow } from "../types/database";
import type { ShipmentInput } from "../schemas";

export async function createShipment(
  supabase: SupabaseClient,
  input: ShipmentInput,
): Promise<ShipmentRow> {
  const { data, error } = await supabase.from("shipments").insert(input).select().single();
  if (error) throw error;
  return data as ShipmentRow;
}

export async function updateShipment(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Omit<ShipmentInput, "po_id">>,
): Promise<ShipmentRow> {
  const { data, error } = await supabase
    .from("shipments")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ShipmentRow;
}

export async function deleteShipment(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("shipments").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Phase 2 — shipment_events is populated by the track-shipments edge
 * function polling UPS/DHL. Empty in MVP; the UI may render it when present.
 */
export async function listShipmentEvents(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<ShipmentEventRow[]> {
  const { data, error } = await supabase
    .from("shipment_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShipmentEventRow[];
}
