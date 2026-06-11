"use client";

import { useState } from "react";
import Link from "next/link";
import {
  STAGE_LABELS,
  can,
  currentStage,
  formatDate,
  isManufacturingStage,
  listPurchaseOrders,
  sumQty,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAsync } from "@/lib/useAsync";
import { useRole } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductThumb } from "@/components/ProductThumb";
import { PoStatusBadge } from "@/components/StatusBadge";

export function OrdersPage() {
  const role = useRole();
  const supabase = getSupabaseBrowserClient();
  const [includeClosed, setIncludeClosed] = useState(false);
  const state = useAsync(() => listPurchaseOrders(supabase, { includeClosed }), [includeClosed]);

  return (
    <div>
      <PageHeader
        title="On Order"
        subtitle="Purchase orders and where they are in manufacturing."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <input
                type="checkbox"
                checked={includeClosed}
                onChange={(e) => setIncludeClosed(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-700"
              />
              Include received &amp; cancelled
            </label>
            {can.editPurchaseOrders(role) ? (
              <Link href="/orders/new">
                <Button>New PO</Button>
              </Link>
            ) : null}
          </>
        }
      />

      {state.loading && !state.data ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {state.data && state.data.length === 0 ? (
        <EmptyState
          title={includeClosed ? "No purchase orders" : "No open purchase orders"}
          description={
            includeClosed
              ? "Create a PO to start tracking an order."
              : "Everything has been received — or nothing is on order yet."
          }
          action={
            can.editPurchaseOrders(role) ? (
              <Link href="/orders/new">
                <Button size="sm">New PO</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {state.data && state.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {state.data.map((po) => {
            const stage = currentStage(po);
            const stageLabel = stage && isManufacturingStage(stage) ? STAGE_LABELS[stage] : stage;
            const totalUnits = sumQty(po.line_items);
            return (
              <Link key={po.id} href={`/orders/${po.id}`} className="group">
                <Card className="flex h-full flex-col gap-3 transition-shadow group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-mono text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {po.po_number}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        {po.supplier?.name ?? "Unknown supplier"}
                      </p>
                    </div>
                    <PoStatusBadge status={po.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 dark:text-stone-400 sm:grid-cols-4">
                    <div>
                      <p className="font-medium text-stone-400 dark:text-stone-500">Ordered</p>
                      <p className="text-stone-700 dark:text-stone-300">{formatDate(po.order_date)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-400 dark:text-stone-500">ETA</p>
                      <p className="text-stone-700 dark:text-stone-300">{formatDate(po.eta)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-400 dark:text-stone-500">Stage</p>
                      <p className="text-amber-700 dark:text-amber-400">{stageLabel ?? "Not started"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-stone-400 dark:text-stone-500">Units</p>
                      <p className="text-stone-700 dark:text-stone-300">{totalUnits.toLocaleString("en-US")}</p>
                    </div>
                  </div>

                  {po.line_items.length > 0 ? (
                    <div className="mt-auto flex items-center gap-2 overflow-x-auto pt-1">
                      {po.line_items.slice(0, 8).map((li) => (
                        <ProductThumb
                          key={li.id}
                          src={li.variant?.photo_url}
                          alt={li.variant?.sku ?? "Line item"}
                          seed={li.variant?.style?.name ?? li.variant?.sku ?? "?"}
                          className="h-12 w-12"
                        />
                      ))}
                      {po.line_items.length > 8 ? (
                        <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                          +{po.line_items.length - 8} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
