import type { SupabaseClient } from "@supabase/supabase-js";
import type { QboSyncLogRow } from "../types/database";

export interface QboConnectionStatus {
  connected: boolean;
  realm_id: string | null;
  environment: "sandbox" | "production" | null;
  connected_at: string | null;
}

/** Admin only. Asks the qbo-oauth edge function whether a company is connected. */
export async function getQboStatus(supabase: SupabaseClient): Promise<QboConnectionStatus> {
  const { data, error } = await supabase.functions.invoke("qbo-oauth", {
    body: { action: "status" },
  });
  if (error) throw error;
  return data as QboConnectionStatus;
}

/**
 * Admin only. Returns the Intuit authorize URL; open it in the browser to
 * run the OAuth 2.0 connect flow (callback is handled server-side).
 */
export async function getQboConnectUrl(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.functions.invoke("qbo-oauth", {
    body: { action: "connect" },
  });
  if (error) throw error;
  return (data as { url: string }).url;
}

export async function disconnectQbo(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.functions.invoke("qbo-oauth", {
    body: { action: "disconnect" },
  });
  if (error) throw error;
}

export async function listSyncLog(
  supabase: SupabaseClient,
  opts: { onlyProblems?: boolean; limit?: number } = {},
): Promise<QboSyncLogRow[]> {
  let q = supabase
    .from("qbo_sync_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.onlyProblems) q = q.in("status", ["error", "pending"]);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QboSyncLogRow[];
}

/** Re-runs a failed/stale sync attempt via the qbo-sync edge function. */
export async function retrySync(supabase: SupabaseClient, syncLogId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("qbo-sync", {
    body: { sync_log_id: syncLogId },
  });
  if (error) throw error;
}
