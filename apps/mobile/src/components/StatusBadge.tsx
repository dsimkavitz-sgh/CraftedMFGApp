import {
  PO_STATUS_LABELS,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  type PoStatus,
  type ShipmentStatus,
} from "@crafted/shared";
import { Badge, type BadgeTone } from "./ui/Badge";

type StatusBadgeProps =
  | { kind: "po"; status: PoStatus }
  | { kind: "shipment"; status: string };

const PO_TONES: Record<PoStatus, BadgeTone> = {
  draft: "neutral",
  ordered: "info",
  in_production: "warn",
  shipped: "info",
  received: "success",
  cancelled: "danger",
};

const SHIPMENT_TONES: Record<ShipmentStatus, BadgeTone> = {
  pending: "neutral",
  in_transit: "info",
  out_for_delivery: "warn",
  delivered: "success",
  exception: "danger",
};

function isShipmentStatus(status: string): status is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(status);
}

/** Maps a PO or shipment status to a tinted Badge. */
export function StatusBadge(props: StatusBadgeProps) {
  if (props.kind === "po") {
    return <Badge label={PO_STATUS_LABELS[props.status]} tone={PO_TONES[props.status]} />;
  }
  if (isShipmentStatus(props.status)) {
    return (
      <Badge label={SHIPMENT_STATUS_LABELS[props.status]} tone={SHIPMENT_TONES[props.status]} />
    );
  }
  return <Badge label={props.status} tone="neutral" />;
}
