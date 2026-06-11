export const USER_ROLES = ["admin", "manager", "warehouse"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPPLIER_TYPES = ["hat_manufacturer", "patch_manufacturer"] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const PO_STATUSES = [
  "draft",
  "ordered",
  "in_production",
  "shipped",
  "received",
  "cancelled",
] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export const CARRIERS = ["ups", "dhl"] as const;
export type Carrier = (typeof CARRIERS)[number];

export const SHIPMENT_STATUSES = [
  "pending",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SYNC_STATUSES = ["pending", "success", "error"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  in_production: "In production",
  shipped: "Shipped",
  received: "Received",
  cancelled: "Cancelled",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  warehouse: "Warehouse",
};

export const CARRIER_LABELS: Record<Carrier, string> = {
  ups: "UPS",
  dhl: "DHL",
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Pending",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
};
