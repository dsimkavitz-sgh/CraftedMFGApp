import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StyleRow,
  StyleWithRelations,
  VariantRow,
  VariantWithInventory,
} from "../types/database";
import type { StyleInput, VariantInput } from "../schemas";
import { buildSku, skuPrefix } from "../config/sku";

const STYLE_SELECT =
  "*, supplier:suppliers(*), variants(*, inventory(*))";

export async function listStyles(
  supabase: SupabaseClient,
  opts: { includeInactive?: boolean } = {},
): Promise<StyleWithRelations[]> {
  let q = supabase.from("styles").select(STYLE_SELECT).order("name");
  if (!opts.includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as StyleWithRelations[];
}

export async function getStyle(supabase: SupabaseClient, id: string): Promise<StyleWithRelations> {
  const { data, error } = await supabase
    .from("styles")
    .select(STYLE_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as StyleWithRelations;
}

export async function createStyle(supabase: SupabaseClient, input: StyleInput): Promise<StyleRow> {
  const { data, error } = await supabase.from("styles").insert(input).select().single();
  if (error) throw error;
  return data as StyleRow;
}

export async function updateStyle(
  supabase: SupabaseClient,
  id: string,
  input: Partial<StyleInput>,
): Promise<StyleRow> {
  const { data, error } = await supabase
    .from("styles")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as StyleRow;
}

const UNIQUE_VIOLATION = "23505";
const MAX_SKU_ATTEMPTS = 20;

/**
 * Creates a variant with an auto-generated, guaranteed-unique SKU
 * (scheme: config/sku.ts) and a zeroed inventory row.
 */
export async function createVariant(
  supabase: SupabaseClient,
  styleName: string,
  input: VariantInput,
): Promise<VariantRow> {
  const prefix = skuPrefix(styleName, input.color);
  const { count, error: countError } = await supabase
    .from("variants")
    .select("id", { count: "exact", head: true })
    .like("sku", `${prefix}%`);
  if (countError) throw countError;

  let sequence = (count ?? 0) + 1;
  for (let attempt = 0; attempt < MAX_SKU_ATTEMPTS; attempt++, sequence++) {
    const sku = buildSku(styleName, input.color, sequence);
    const { data, error } = await supabase
      .from("variants")
      .insert({ ...input, sku })
      .select()
      .single();
    if (!error) return data as VariantRow;
    if (error.code !== UNIQUE_VIOLATION) throw error;
  }
  throw new Error(`Could not allocate a unique SKU with prefix ${prefix}`);
}

export async function updateVariant(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Pick<VariantRow, "color" | "size" | "photo_url">>,
): Promise<VariantRow> {
  const { data, error } = await supabase
    .from("variants")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as VariantRow;
}

export async function listVariantsForStyle(
  supabase: SupabaseClient,
  styleId: string,
): Promise<VariantWithInventory[]> {
  const { data, error } = await supabase
    .from("variants")
    .select("*, inventory(*)")
    .eq("style_id", styleId)
    .order("sku");
  if (error) throw error;
  return (data ?? []) as unknown as VariantWithInventory[];
}

/**
 * Phase 2 (barcode scanning): look up a variant by SKU or barcode.
 * The scan UI will call this after decoding a Code128 barcode.
 */
export async function findVariantByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<VariantWithInventory | null> {
  const { data, error } = await supabase
    .from("variants")
    .select("*, inventory(*)")
    .or(`sku.eq.${code},barcode.eq.${code}`)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as VariantWithInventory | null;
}
