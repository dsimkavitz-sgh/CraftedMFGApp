import { z } from "zod";
import { CARRIERS, PO_STATUSES, SUPPLIER_TYPES, USER_ROLES } from "../types/enums";
import { MANUFACTURING_STAGES } from "../constants/stages";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.enum(SUPPLIER_TYPES),
  country: z.string().trim().max(100).nullish(),
  alibaba_reference: z.string().trim().max(200).nullish(),
  uses_trade_assurance: z.boolean().nullish(),
  contact_notes: z.string().trim().max(5000).nullish(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const styleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(5000).nullish(),
  supplier_id: z.string().uuid().nullish(),
  hero_photo_url: z.string().url().nullish(),
  active: z.boolean().default(true),
});
export type StyleInput = z.infer<typeof styleSchema>;

export const variantSchema = z.object({
  style_id: z.string().uuid(),
  color: z.string().trim().min(1, "Color is required").max(100),
  size: z.string().trim().min(1, "Size is required").max(50),
  photo_url: z.string().url().nullish(),
});
export type VariantInput = z.infer<typeof variantSchema>;

export const inventoryAdjustmentSchema = z.object({
  variant_id: z.string().uuid(),
  delta: z
    .number()
    .int("Quantity change must be a whole number")
    .refine((n) => n !== 0, "Quantity change cannot be zero"),
  reason: z.string().trim().min(3, "A reason is required (min 3 characters)").max(500),
});
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const poLineItemSchema = z.object({
  variant_id: z.string().uuid("Pick a variant"),
  qty: z.number().int().positive("Quantity must be at least 1"),
  unit_cost: z.number().nonnegative().nullish(),
});

export const purchaseOrderSchema = z.object({
  po_number: z.string().trim().min(1, "PO number is required").max(50),
  supplier_id: z.string().uuid("Pick a supplier"),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  eta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullish(),
  status: z.enum(PO_STATUSES).default("draft"),
  notes: z.string().trim().max(5000).nullish(),
  line_items: z.array(poLineItemSchema).min(1, "Add at least one line item"),
});
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const stageEventSchema = z.object({
  po_id: z.string().uuid(),
  stage: z.enum(MANUFACTURING_STAGES),
  note: z.string().trim().max(2000).nullish(),
});
export type StageEventInput = z.infer<typeof stageEventSchema>;

export const shipmentSchema = z.object({
  po_id: z.string().uuid(),
  carrier: z.enum(CARRIERS),
  tracking_number: z.string().trim().min(4, "Tracking number is required").max(100),
  status: z.string().trim().min(1).max(50).default("pending"),
  eta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullish(),
});
export type ShipmentInput = z.infer<typeof shipmentSchema>;

export const userRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(USER_ROLES),
});
export type UserRoleInput = z.infer<typeof userRoleSchema>;
