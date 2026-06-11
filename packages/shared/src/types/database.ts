/**
 * Hand-maintained Postgres row types matching supabase/migrations.
 * If you change the schema, update these (or replace this file with
 * `supabase gen types typescript` output — the shapes are compatible).
 */
import type {
  Carrier,
  PoStatus,
  SupplierType,
  SyncStatus,
  UserRole,
} from "./enums";

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  type: SupplierType;
  country: string | null;
  alibaba_reference: string | null;
  uses_trade_assurance: boolean | null;
  contact_notes: string | null;
  created_at: string;
}

export interface StyleRow {
  id: string;
  name: string;
  description: string | null;
  supplier_id: string | null;
  hero_photo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface VariantRow {
  id: string;
  style_id: string;
  color: string;
  size: string;
  sku: string;
  /** Reserved for Phase 2 Code128 generation; null in MVP. */
  barcode: string | null;
  photo_url: string | null;
  /** QuickBooks Online Item id once mapped; null until first sync. */
  qbo_entity_id: string | null;
  created_at: string;
}

export interface InventoryRow {
  variant_id: string;
  qty_on_hand: number;
  location: string | null;
  updated_at: string;
}

export interface InventoryAdjustmentRow {
  id: string;
  variant_id: string;
  delta: number;
  new_qty: number;
  reason: string;
  user_id: string | null;
  created_at: string;
}

export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  eta: string | null;
  status: PoStatus;
  notes: string | null;
  created_at: string;
}

export interface PoLineItemRow {
  id: string;
  po_id: string;
  variant_id: string;
  qty: number;
  unit_cost: number | null;
}

export interface ManufacturingStageEventRow {
  id: string;
  po_id: string;
  /** Plain text so the pipeline in constants/stages.ts stays configurable. */
  stage: string;
  note: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface ShipmentRow {
  id: string;
  po_id: string;
  carrier: Carrier;
  tracking_number: string;
  status: string;
  eta: string | null;
  last_event_summary: string | null;
  last_checked_at: string | null;
  created_at: string;
}

/** Phase 2 — populated by the track-shipments edge function. */
export interface ShipmentEventRow {
  id: string;
  shipment_id: string;
  code: string | null;
  description: string | null;
  location: string | null;
  occurred_at: string;
}

export interface PushTokenRow {
  id: string;
  user_id: string;
  expo_token: string;
  platform: string;
  created_at: string;
}

export interface QboSyncLogRow {
  id: string;
  entity: string;
  action: string;
  status: SyncStatus;
  qbo_entity_id: string | null;
  payload: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}

// ── Joined shapes returned by the API layer ─────────────────────────────────

export interface VariantWithInventory extends VariantRow {
  inventory: InventoryRow | null;
}

export interface StyleWithRelations extends StyleRow {
  supplier: SupplierRow | null;
  variants: VariantWithInventory[];
}

export interface InventoryListItem extends VariantRow {
  inventory: InventoryRow | null;
  style: (StyleRow & { supplier: SupplierRow | null }) | null;
}

export interface PoLineItemWithVariant extends PoLineItemRow {
  variant: (VariantRow & { style: StyleRow | null }) | null;
}

export interface PurchaseOrderWithRelations extends PurchaseOrderRow {
  supplier: SupplierRow | null;
  line_items: PoLineItemWithVariant[];
  stage_events: ManufacturingStageEventRow[];
  shipments: ShipmentRow[];
}

export interface AdjustmentWithRelations extends InventoryAdjustmentRow {
  user: Pick<UserRow, "id" | "full_name" | "email"> | null;
  variant: Pick<VariantRow, "id" | "sku" | "color" | "size"> | null;
}

export interface StageEventWithUser extends ManufacturingStageEventRow {
  user: Pick<UserRow, "id" | "full_name"> | null;
}
