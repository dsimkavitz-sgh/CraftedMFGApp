// ── Phase 2 stub: live carrier tracking ──────────────────────────────────────
// Planned behavior (do not implement in MVP):
//  1. Run on a schedule (pg_cron + pg_net invoking this function, or
//     `supabase functions schedule`), e.g. every 30 minutes.
//  2. For each shipment not yet delivered:
//       - UPS:  OAuth client-credentials → GET /api/track/v1/details/{tracking}
//               TODO(creds): UPS_CLIENT_ID / UPS_CLIENT_SECRET (developer.ups.com)
//       - DHL:  GET https://api-eu.dhl.com/track/shipments?trackingNumber=...
//               TODO(creds): DHL_API_KEY (developer.dhl.com)
//  3. Insert new rows into shipment_events (table already exists, keyed by
//     carrier event code + occurred_at to dedupe).
//  4. Update shipments.status / eta / last_event_summary / last_checked_at.
//  5. On status change / exception / ETA change / delivered: send Expo push
//     notifications to push_tokens via https://exp.host/--/api/v2/push/send.
import { json, corsHeaders } from "../_shared/qbo.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return json(
    {
      error:
        "Not implemented — Phase 2. See the plan in supabase/functions/track-shipments/index.ts.",
    },
    501,
  );
});
