import type { Carrier } from "../types/enums";

/** Deep link to the carrier's public tracking page (MVP — Phase 2 adds live API polling). */
export function carrierTrackingUrl(carrier: Carrier, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber.trim());
  switch (carrier) {
    case "ups":
      return `https://www.ups.com/track?tracknum=${tn}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
    case "dhl":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tn}`;
  }
}
