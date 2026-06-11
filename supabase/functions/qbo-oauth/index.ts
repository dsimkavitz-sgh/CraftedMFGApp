// QuickBooks Online OAuth 2.0 connect flow (Intuit).
//
// POST {action: "connect"}    (admin JWT) → { url } to open in a browser
// GET  /callback?code&realmId&state       → exchanges code, stores tokens,
//                                           redirects to QBO_APP_RETURN_URL
// POST {action: "status"}     (admin JWT) → connection status
// POST {action: "disconnect"} (admin JWT) → deletes stored tokens
//
// Tokens live in the qbo_connection singleton row (service-role only).
// verify_jwt is off for this function because Intuit calls /callback without
// a Supabase JWT; admin-gated actions check the caller's role themselves.
import {
  callerRole,
  corsHeaders,
  exchangeCodeForTokens,
  INTUIT_AUTH_URL,
  json,
  QBO_ENV,
  requireEnv,
  serviceClient,
} from "../_shared/qbo.ts";

// CSRF state parameters issued for in-flight connect attempts (10 min TTL).
const STATE_TTL_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const supabase = serviceClient();

  try {
    // ── Intuit redirect target ────────────────────────────────────────────
    if (req.method === "GET" && url.pathname.endsWith("/callback")) {
      const code = url.searchParams.get("code");
      const realmId = url.searchParams.get("realmId");
      const state = url.searchParams.get("state");
      if (!code || !realmId || !state) return json({ error: "Missing code/realmId/state" }, 400);

      const { data: stateRow } = await supabase
        .from("qbo_oauth_states")
        .select("state, created_at")
        .eq("state", state)
        .maybeSingle();
      if (!stateRow || Date.now() - new Date(stateRow.created_at).getTime() > STATE_TTL_MS) {
        return json({ error: "Invalid or expired OAuth state — restart the connect flow." }, 400);
      }
      await supabase.from("qbo_oauth_states").delete().eq("state", state);

      const tokens = await exchangeCodeForTokens(code);
      const now = Date.now();
      const { error } = await supabase.from("qbo_connection").upsert({
        id: 1,
        realm_id: realmId,
        environment: QBO_ENV,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        access_token_expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
        refresh_token_expires_at: new Date(
          now + tokens.x_refresh_token_expires_in * 1000,
        ).toISOString(),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      const returnUrl = Deno.env.get("QBO_APP_RETURN_URL") ?? "/";
      return Response.redirect(`${returnUrl}?qbo=connected`, 302);
    }

    // ── Admin-gated JSON actions ──────────────────────────────────────────
    const role = await callerRole(req);
    if (role !== "admin") return json({ error: "Admin access required" }, 403);

    const { action } = await req.json().catch(() => ({ action: null }));

    if (action === "connect") {
      const state = crypto.randomUUID();
      // Persist the CSRF state where the callback (which has no JWT) can verify it.
      const { error } = await supabase.from("qbo_oauth_states").insert({ state });
      if (error) throw error;
      const authorize = new URL(INTUIT_AUTH_URL);
      authorize.searchParams.set("client_id", requireEnv("QBO_CLIENT_ID"));
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("scope", "com.intuit.quickbooks.accounting");
      authorize.searchParams.set("redirect_uri", requireEnv("QBO_REDIRECT_URI"));
      authorize.searchParams.set("state", state);
      return json({ url: authorize.toString() });
    }

    if (action === "status") {
      const { data } = await supabase
        .from("qbo_connection")
        .select("realm_id, environment, connected_at")
        .eq("id", 1)
        .maybeSingle();
      return json({
        connected: !!data,
        realm_id: data?.realm_id ?? null,
        environment: data?.environment ?? null,
        connected_at: data?.connected_at ?? null,
      });
    }

    if (action === "disconnect") {
      const { error } = await supabase.from("qbo_connection").delete().eq("id", 1);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("qbo-oauth error:", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
