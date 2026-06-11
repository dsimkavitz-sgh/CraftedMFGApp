"use client";

import { useState } from "react";
import {
  can,
  formatDateTime,
  listAdjustments,
  listInventory,
  listStyles,
  listSuppliers,
  type InventoryListItem,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAsync, useDebouncedValue } from "@/lib/useAsync";
import { useRole } from "@/components/providers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock, Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductThumb } from "@/components/ProductThumb";
import { AdjustInventoryModal, type AdjustTarget } from "@/components/AdjustInventoryModal";

function HistoryModal({ item, onClose }: { item: InventoryListItem; onClose: () => void }) {
  const supabase = getSupabaseBrowserClient();
  const state = useAsync(() => listAdjustments(supabase, { variantId: item.id }), [item.id]);

  return (
    <Modal open onClose={onClose} title={`History — ${item.sku}`} widthClass="sm:max-w-xl">
      {state.loading && !state.data ? <LoadingBlock label="Loading history…" /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}
      {state.data && state.data.length === 0 ? (
        <EmptyState title="No adjustments yet" description="Changes to this variant will appear here." />
      ) : null}
      {state.data && state.data.length > 0 ? (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {state.data.map((adj) => (
            <li key={adj.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm text-stone-700 dark:text-stone-300">{adj.reason}</p>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {adj.user?.full_name ?? "Unknown"} · {formatDateTime(adj.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  adj.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {adj.delta >= 0 ? `+${adj.delta}` : adj.delta} → {adj.new_qty}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}

export function InventoryPage() {
  const role = useRole();
  const supabase = getSupabaseBrowserClient();

  const [search, setSearch] = useState("");
  const [styleId, setStyleId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [color, setColor] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const debouncedColor = useDebouncedValue(color);

  const styles = useAsync(() => listStyles(supabase, { includeInactive: true }), []);
  const suppliers = useAsync(() => listSuppliers(supabase), []);

  const inventory = useAsync(
    () =>
      listInventory(supabase, {
        search: debouncedSearch.trim() || undefined,
        styleId: styleId || undefined,
        supplierId: supplierId || undefined,
        color: debouncedColor.trim() || undefined,
      }),
    [debouncedSearch, styleId, supplierId, debouncedColor],
  );

  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryListItem | null>(null);

  function applyAdjustedQty(variantId: string, newQty: number) {
    inventory.setData((prev) => {
      if (!prev) return prev;
      return prev.map((item): InventoryListItem => {
        if (item.id !== variantId) return item;
        return {
          ...item,
          inventory: item.inventory
            ? { ...item.inventory, qty_on_hand: newQty }
            : { variant_id: variantId, qty_on_hand: newQty, location: null, updated_at: new Date().toISOString() },
        };
      });
    });
  }

  const items = inventory.data ?? [];
  const hasFilters = Boolean(search || styleId || supplierId || color);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="On-hand quantities for every variant." />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SKU, color, size…"
          />
          <Select label="Style" value={styleId} onChange={(e) => setStyleId(e.target.value)}>
            <option value="">All styles</option>
            {(styles.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All suppliers</option>
            {(suppliers.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            label="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g. Navy"
          />
        </div>
      </Card>

      {inventory.error ? (
        <ErrorAlert message={inventory.error} onRetry={inventory.reload} />
      ) : inventory.loading && !inventory.data ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching variants" : "No inventory yet"}
          description={
            hasFilters
              ? "Try clearing a filter or broadening your search."
              : "Add styles and variants in the catalog to start tracking stock."
          }
        />
      ) : (
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5 dark:border-stone-800 sm:px-6">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {items.length} variant{items.length === 1 ? "" : "s"}
            </p>
            {inventory.loading ? <Spinner size="sm" /> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <th className="sticky left-0 z-10 bg-white px-4 py-2.5 dark:bg-stone-900 sm:px-6">SKU</th>
                  <th className="px-4 py-2.5">Style</th>
                  <th className="px-4 py-2.5">Color / Size</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5 text-right">On hand</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {items.map((item) => {
                  const qty = item.inventory?.qty_on_hand ?? 0;
                  return (
                    <tr key={item.id}>
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 dark:bg-stone-900 sm:px-6">
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            src={item.photo_url}
                            alt={item.sku}
                            seed={item.style?.name ?? item.sku}
                            className="h-9 w-9"
                          />
                          <span className="whitespace-nowrap font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                            {item.sku}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-700 dark:text-stone-300">
                        {item.style?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-700 dark:text-stone-300">
                        {item.color} / {item.size}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-500 dark:text-stone-400">
                        {item.style?.supplier?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-500 dark:text-stone-400">
                        {item.inventory?.location ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge tone={qty <= 0 ? "rose" : qty < 25 ? "amber" : "emerald"}>{qty}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setHistoryItem(item)}>
                            History
                          </Button>
                          {can.adjustInventory(role) ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setAdjustTarget({
                                  variantId: item.id,
                                  sku: item.sku,
                                  color: item.color,
                                  size: item.size,
                                  qtyOnHand: qty,
                                })
                              }
                            >
                              Adjust
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {adjustTarget ? (
        <AdjustInventoryModal
          target={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onAdjusted={(newQty) => applyAdjustedQty(adjustTarget.variantId, newQty)}
        />
      ) : null}

      {historyItem ? <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} /> : null}
    </div>
  );
}
