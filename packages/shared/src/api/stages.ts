import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManufacturingStageEventRow, StageEventWithUser } from "../types/database";
import type { StageEventInput } from "../schemas";

/**
 * Appends a stage event for a PO. History is append-only; the latest row is
 * the PO's current stage. updated_by defaults to auth.uid() in the DB.
 */
export async function recordStageEvent(
  supabase: SupabaseClient,
  input: StageEventInput,
): Promise<ManufacturingStageEventRow> {
  const { data, error } = await supabase
    .from("manufacturing_stage_events")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as ManufacturingStageEventRow;
}

export async function listStageHistory(
  supabase: SupabaseClient,
  poId: string,
): Promise<StageEventWithUser[]> {
  const { data, error } = await supabase
    .from("manufacturing_stage_events")
    .select("*, user:users(id, full_name)")
    .eq("po_id", poId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StageEventWithUser[];
}
