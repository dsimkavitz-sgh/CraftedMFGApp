"use client";

import {
  PO_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  type PoStatus,
  type ShipmentStatus,
  type SyncStatus,
} from "@crafted/shared";
import { Badge } from "@/components/ui/Badge";
import { poStatusTone, shipmentStatusTone, syncStatusTone } from "@/lib/status";

export function PoStatusBadge({ status }: { status: PoStatus }) {
  return <Badge tone={poStatusTone(status)}>{PO_STATUS_LABELS[status]}</Badge>;
}

export function ShipmentStatusBadge({ status }: { status: string }) {
  const label =
    status in SHIPMENT_STATUS_LABELS ? SHIPMENT_STATUS_LABELS[status as ShipmentStatus] : status;
  return <Badge tone={shipmentStatusTone(status)}>{label}</Badge>;
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  return <Badge tone={syncStatusTone(status)}>{status}</Badge>;
}
