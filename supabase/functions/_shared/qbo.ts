// Shared QuickBooks Online helpers for edge functions (Deno).
// One-way sync: app → QBO. The app is the source of truth.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const QBO_ENV = (Deno.env.get("QBO_ENVIRONMENT") ?? "sandbox") as
  | "sandbox"
  | "production";

const QBO_API_BASE =
  QBO_ENV === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

export const INTUIT_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
export const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export interface QboConnection {
  id: number;
  realm_id: string;
  environment: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}`);
  return v;
}

function basicAuthHeader(): string {
  const id = requireEnv("QBO_CLIENT_ID");
  const secret = requireEnv("QBO_CLIENT_SECRET");
  return `Basic ${btoa(`${id}:${secret}`)}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}> {
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: requireEnv("QBO_REDIRECT_URI"),
    }),
  });
  if (!res.ok) throw new Error(`Intuit token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/** Returns a connection with a fresh access token, refreshing + persisting if expired. */
export async function getFreshConnection(supabase: SupabaseClient): Promise<QboConnection> {
  const { data, error } = await supabase
    .from("qbo_connection")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("QuickBooks is not connected. An admin must connect it first.");
  const conn = data as QboConnection;

  const expiresAt = new Date(conn.access_token_expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return conn;

  if (new Date(conn.refresh_token_expires_at).getTime() < Date.now()) {
    throw new Error("QuickBooks refresh token expired — an admin must reconnect.");
  }

  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Intuit token refresh failed (${res.status}): ${await res.text()}`);
  const tokens = await res.json();

  const updated = {
    access_token: tokens.access_token as string,
    refresh_token: tokens.refresh_token as string,
    access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    refresh_token_expires_at: new Date(
      Date.now() + tokens.x_refresh_token_expires_in * 1000,
    ).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error: upError } = await supabase.from("qbo_connection").update(updated).eq("id", 1);
  if (upError) throw upError;
  return { ...conn, ...updated };
}

export async function qboRequest(
  conn: QboConnection,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const url = `${QBO_API_BASE}/v3/company/${conn.realm_id}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`QBO ${method} ${path} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

/** Look up the caller's app role from their JWT (for admin-gated actions). */
export async function callerRole(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const {
    data: { user },
  } = await anonClient.auth.getUser();
  if (!user) return null;
  const { data } = await serviceClient().from("users").select("role").eq("id", user.id).single();
  return (data as { role: string } | null)?.role ?? null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
