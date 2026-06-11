import type { PoStatus, SyncStatus } from "@crafted/shared";

/** Semantic badge tones mapped to Tailwind classes in components/ui/Badge.tsx. */
export type BadgeTone = "emerald" | "sky" | "amber" | "rose" | "stone";

export function poStatusTone(status: PoStatus): BadgeTone {
  switch (status) {
    case "received":
      return "emerald";
    case "ordered":
    case "shipped":
      return "sky";
    case "in_production":
      return "amber";
    case "cancelled":
      return "rose";
    case "draft":
      return "stone";
  }
}

/** Shipment status is stored as plain text; map the known values, default stone. */
export function shipmentStatusTone(status: string): BadgeTone {
  switch (status) {
    case "delivered":
      return "emerald";
    case "in_transit":
    case "out_for_delivery":
      return "sky";
    case "pending":
      return "amber";
    case "exception":
      return "rose";
    default:
      return "stone";
  }
}

export function syncStatusTone(status: SyncStatus): BadgeTone {
  switch (status) {
    case "success":
      return "emerald";
    case "pending":
      return "amber";
    case "error":
      return "rose";
  }
}
