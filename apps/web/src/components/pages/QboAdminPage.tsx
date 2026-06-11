"use client";

import { useState } from "react";
import {
  disconnectQbo,
  formatDateTime,
  getQboConnectUrl,
  getQboStatus,
  listSyncLog,
  retrySync,
  type QboSyncLogRow,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock, Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SyncStatusBadge } from "@/components/StatusBadge";

function payloadField(row: QboSyncLogRow, key: string): string {
  const value = row.payload?.[key];
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function QboAdminPage() {
  const supabase = getSupabaseBrowserClient();
  const status = useAsync(() => getQboStatus(supabase), []);

  const [onlyProblems, setOnlyProblems] = useState(false);
  const log = useAsync(() => listSyncLog(supabase, { onlyProblems }), [onlyProblems]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function connect() {
    setActionError(null);
    setConnecting(true);
    try {
      const url = await getQboConnectUrl(supabase);
      window.location.href = url;
    } catch (e) {
      setActionError(errorMessage(e));
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect QuickBooks? Inventory will stop syncing until you reconnect.")) return;
    setActionError(null);
    setDisconnecting(true);
    try {
      await disconnectQbo(supabase);
      status.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setDisconnecting(false);
    }
  }

  async function retry(row: QboSyncLogRow) {
    setActionError(null);
    setRetryingId(row.id);
    try {
      await retrySync(supabase, row.id);
      log.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="QuickBooks Online"
        subtitle="Connection status and the inventory sync log."
      />

      {actionError ? (
        <div className="mb-4">
          <ErrorAlert message={actionError} />
        </div>
      ) : null}

      {/* Connection card */}
      <Card className="mb-6">
        {status.loading && !status.data ? (
          <div className="flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
            <Spinner size="sm" /> Checking connection…
          </div>
        ) : status.error ? (
          <ErrorAlert message={status.error} onRetry={status.reload} />
        ) : status.data ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${status.data.connected ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-600"}`}
                />
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {status.data.connected ? "Connected" : "Not connected"}
                </p>
                {status.data.environment ? <Badge tone="stone">{status.data.environment}</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {status.data.connected
                  ? `Realm ${status.data.realm_id ?? "—"} · since ${formatDateTime(status.data.connected_at)}`
                  : "Connect your QuickBooks company to sync inventory quantities."}
              </p>
            </div>
            <div className="flex gap-2">
              {status.data.connected ? (
                <Button variant="danger" size="sm" loading={disconnecting} onClick={() => void disconnect()}>
                  Disconnect
                </Button>
              ) : (
                <Button loading={connecting} onClick={() => void connect()}>
                  Connect QuickBooks
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Sync log */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
          <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Sync log
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={(e) => setOnlyProblems(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500 dark:border-stone-700"
              />
              Show problems only
            </label>
            <Button variant="secondary" size="sm" onClick={log.reload}>
              Refresh
            </Button>
          </div>
        </div>

        {log.loading && !log.data ? <LoadingBlock /> : null}
        {log.error ? (
          <div className="p-4">
            <ErrorAlert message={log.error} onRetry={log.reload} />
          </div>
        ) : null}
        {log.data && log.data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={onlyProblems ? "No problems" : "No sync activity yet"}
              description={
                onlyProblems
                  ? "Nothing pending or failed — all syncs succeeded."
                  : "Inventory adjustments queue sync entries here."
              }
            />
          </div>
        ) : null}
        {log.data && log.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <th className="px-4 py-2.5 sm:px-6">Status</th>
                  <th className="px-4 py-2.5">Entity / Action</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5">Error</th>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {log.data.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 sm:px-6">
                      <SyncStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-700 dark:text-stone-300">
                      {row.entity} / {row.action}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-stone-700 dark:text-stone-300">
                      {payloadField(row, "sku")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-stone-700 dark:text-stone-300">
                      {payloadField(row, "qty")}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400" title={row.error ?? undefined}>
                      {row.error ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-stone-500 dark:text-stone-400">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.status === "error" || row.status === "pending" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={retryingId === row.id}
                          onClick={() => void retry(row)}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
