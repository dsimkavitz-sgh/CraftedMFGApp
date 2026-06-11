/**
 * SKU generation scheme — the single source of truth.
 *
 * Format: CM-{STYLE_ABBR}-{COLOR_ABBR}-{NNN}
 *   e.g. style "Classic Trucker", color "Navy", 3rd variant → CM-CLA-NAV-003
 *
 * Uniqueness is guaranteed by a unique index on variants.sku; callers retry
 * with the next sequence number on a unique-violation (see createVariant in
 * api/catalog.ts).
 *
 * Phase 2: Code128 barcodes will be generated from the SKU; the
 * variants.barcode column already exists and stays null in MVP.
 */
export const SKU_CONFIG = {
  prefix: "CM",
  separator: "-",
  abbrLength: 3,
  sequencePadding: 3,
} as const;

/** "Classic Trucker" → "CLA"; strips non-alphanumerics, uppercases. */
export function abbreviate(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (cleaned || "XXX").slice(0, SKU_CONFIG.abbrLength).padEnd(SKU_CONFIG.abbrLength, "X");
}

/** The SKU prefix shared by all variants of a style+color, e.g. "CM-CLA-NAV-". */
export function skuPrefix(styleName: string, color: string): string {
  const s = SKU_CONFIG.separator;
  return `${SKU_CONFIG.prefix}${s}${abbreviate(styleName)}${s}${abbreviate(color)}${s}`;
}

export function buildSku(styleName: string, color: string, sequence: number): string {
  return `${skuPrefix(styleName, color)}${String(sequence).padStart(SKU_CONFIG.sequencePadding, "0")}`;
}
