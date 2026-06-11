"use client";

import Link from "next/link";
import {
  formatDateTime,
  listAdjustments,
  listInventory,
  listPurchaseOrders,
  listStyles,
  type AdjustmentWithRelations,
  type InventoryListItem,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAsync } from "@/lib/useAsync";
import { useProfile } from "@/components/providers";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductThumb } from "@/components/ProductThumb";

const LOW_STOCK_THRESHOLD = 25;

interface DashboardData {
  totalOnHand: number;
  activeStyles: number;
  openPos: number;
  inTransit: number;
  lowStock: InventoryListItem[];
  recentAdjustments: AdjustmentWithRelations[];
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <span className={`text-3xl font-semibold tracking-tight ${accent ?? "text-stone-900 dark:text-stone-100"}`}>
        {value.toLocaleString("en-US")}
      </span>
    </Card>
  );
}

export function DashboardPage() {
  const profile = useProfile();
  const supabase = getSupabaseBrowserClient();

  const state = useAsync<DashboardData>(async () => {
    const [inventory, styles, pos, adjustments] = await Promise.all([
      listInventory(supabase),
      listStyles(supabase),
      listPurchaseOrders(supabase),
      listAdjustments(supabase, { limit: 8 }),
    ]);
    const totalOnHand = inventory.reduce((acc, item) => acc + (item.inventory?.qty_on_hand ?? 0), 0);
    const inTransit = pos
      .flatMap((po) => po.shipments)
      .filter((s) => s.status === "in_transit" || s.status === "out_for_delivery").length;
    const lowStock = inventory
      .filter((item) => (item.inventory?.qty_on_hand ?? 0) < LOW_STOCK_THRESHOLD)
      .sort((a, b) => (a.inventory?.qty_on_hand ?? 0) - (b.inventory?.qty_on_hand ?? 0))
      .slice(0, 8);
    return {
      totalOnHand,
      activeStyles: styles.length,
      openPos: pos.length,
      inTransit,
      lowStock,
      recentAdjustments: adjustments,
    };
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="Here's what's happening across the floor today."
      />

      {state.loading && !state.data ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {state.data ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Units on hand" value={state.data.totalOnHand} />
            <StatCard label="Active styles" value={state.data.activeStyles} />
            <StatCard label="Open POs" value={state.data.openPos} accent="text-sky-600 dark:text-sky-400" />
            <StatCard
              label="In-transit shipments"
              value={state.data.inTransit}
              accent="text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card padded={false}>
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
                <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  Low stock (under {LOW_STOCK_THRESHOLD})
                </h2>
                <Link href="/inventory" className="text-xs font-medium text-stone-900 hover:underline dark:text-stone-100">
                  View inventory
                </Link>
              </div>
              {state.data.lowStock.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No low-stock variants" description="Everything is comfortably stocked." />
                </div>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {state.data.lowStock.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                      <ProductThumb
                        src={item.photo_url}
                        alt={item.sku}
                        seed={item.style?.name ?? item.sku}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                          {item.sku}
                        </p>
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                          {item.style?.name ?? "Unknown style"} · {item.color} / {item.size}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {item.inventory?.qty_on_hand ?? 0} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padded={false}>
              <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
                <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  Recent adjustments
                </h2>
              </div>
              {state.data.recentAdjustments.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No adjustments yet" description="Inventory changes will show up here." />
                </div>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {state.data.recentAdjustments.map((adj) => (
                    <li key={adj.id} className="px-4 py-3 sm:px-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                          {adj.variant?.sku ?? "Unknown SKU"}
                        </p>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            adj.delta >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {adj.delta >= 0 ? `+${adj.delta}` : adj.delta} → {adj.new_qty}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        {adj.reason} — {adj.user?.full_name ?? "Unknown"}, {formatDateTime(adj.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
