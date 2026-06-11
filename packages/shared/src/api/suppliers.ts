import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplierRow } from "../types/database";
import type { SupplierInput } from "../schemas";

export async function listSuppliers(supabase: SupabaseClient): Promise<SupplierRow[]> {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as SupplierRow[];
}

export async function getSupplier(supabase: SupabaseClient, id: string): Promise<SupplierRow> {
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (error) throw error;
  return data as SupplierRow;
}

export async function createSupplier(
  supabase: SupabaseClient,
  input: SupplierInput,
): Promise<SupplierRow> {
  const { data, error } = await supabase.from("suppliers").insert(input).select().single();
  if (error) throw error;
  return data as SupplierRow;
}

export async function updateSupplier(
  supabase: SupabaseClient,
  id: string,
  input: Partial<SupplierInput>,
): Promise<SupplierRow> {
  const { data, error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SupplierRow;
}

export async function deleteSupplier(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}
