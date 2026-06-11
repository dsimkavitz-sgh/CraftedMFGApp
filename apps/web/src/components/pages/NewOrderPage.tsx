"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  can,
  createPurchaseOrder,
  listInventory,
  listPurchaseOrders,
  listSuppliers,
  purchaseOrderSchema,
  type InventoryListItem,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { emptyToNull, type FieldErrors } from "@/lib/forms";
import { useRole } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { VariantPicker } from "@/components/VariantPicker";

interface LineDraft {
  key: number;
  variant: InventoryListItem | null;
  qty: string;
  unitCost: string;
}

interface LineErrors {
  variant_id?: string;
  qty?: string;
  unit_cost?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function suggestPoNumber(existing: { po_number: string }[]): string {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  let max = 0;
  for (const po of existing) {
    if (!po.po_number.startsWith(prefix)) continue;
    const n = Number.parseInt(po.po_number.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function NewOrderPage() {
  const role = useRole();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const lookups = useAsync(async () => {
    const [suppliers, variants, pos] = await Promise.all([
      listSuppliers(supabase),
      listInventory(supabase),
      listPurchaseOrders(supabase, { includeClosed: true }),
    ]);
    return { suppliers, variants, suggestion: suggestPoNumber(pos) };
  }, []);

  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(todayIso());
  const [eta, setEta] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ key: 1, variant: null, qty: "", unitCost: "" }]);
  const [nextKey, setNextKey] = useState(2);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [lineErrors, setLineErrors] = useState<Record<number, LineErrors>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill the PO number suggestion once lookups load (unless the user typed).
  useEffect(() => {
    if (lookups.data && poNumber === "") setPoNumber(lookups.data.suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups.data]);

  if (!can.editPurchaseOrders(role)) {
    return (
      <div>
        <PageHeader title="New purchase order" />
        <ErrorAlert message="You don't have permission to create purchase orders." />
      </div>
    );
  }

  function updateLine(key: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const candidate = {
      po_number: poNumber,
      supplier_id: supplierId,
      order_date: orderDate,
      eta: emptyToNull(eta),
      notes: emptyToNull(notes),
      line_items: lines.map((l) => ({
        variant_id: l.variant?.id ?? "",
        qty: Number.parseInt(l.qty, 10) || 0,
        unit_cost: l.unitCost.trim() === "" ? null : Number.parseFloat(l.unitCost),
      })),
    };

    const parsed = purchaseOrderSchema.safeParse(candidate);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      const le: Record<number, LineErrors> = {};
      for (const issue of parsed.error.issues) {
        const head = issue.path[0];
        if (head === "line_items") {
          const idx = issue.path[1];
          const field = issue.path[2];
          if (typeof idx === "number") {
            const entry = le[idx] ?? {};
            if (field === "variant_id" && entry.variant_id === undefined) entry.variant_id = issue.message;
            else if (field === "qty" && entry.qty === undefined) entry.qty = issue.message;
            else if (field === "unit_cost" && entry.unit_cost === undefined) entry.unit_cost = issue.message;
            le[idx] = entry;
          } else if (fe["line_items"] === undefined) {
            fe["line_items"] = issue.message;
          }
        } else if (typeof head === "string" && fe[head] === undefined) {
          fe[head] = issue.message;
        }
      }
      setFieldErrors(fe);
      setLineErrors(le);
      return;
    }

    setFieldErrors({});
    setLineErrors({});
    setSaving(true);
    try {
      const created = await createPurchaseOrder(supabase, parsed.data);
      router.push(`/orders/${created.id}`);
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link href="/orders" className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
          ← Back to orders
        </Link>
      </div>
      <PageHeader title="New purchase order" subtitle="Order hats from a supplier." />

      {lookups.loading && !lookups.data ? <LoadingBlock /> : null}
      {lookups.error ? <ErrorAlert message={lookups.error} onRetry={lookups.reload} /> : null}

      {lookups.data ? (
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="PO number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder={lookups.data.suggestion}
                error={fieldErrors["po_number"]}
              />
              <Select
                label="Supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                error={fieldErrors["supplier_id"]}
              >
                <option value="">Pick a supplier…</option>
                {lookups.data.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Order date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                error={fieldErrors["order_date"]}
              />
              <Input
                label="ETA"
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                error={fieldErrors["eta"]}
              />
            </div>
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Packaging requirements, payment terms…"
              error={fieldErrors["notes"]}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Line items
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLines((prev) => [...prev, { key: nextKey, variant: null, qty: "", unitCost: "" }]);
                  setNextKey((k) => k + 1);
                }}
              >
                Add line
              </Button>
            </div>
            {fieldErrors["line_items"] ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">{fieldErrors["line_items"]}</p>
            ) : null}

            <div className="flex flex-col gap-4">
              {lines.map((line, i) => {
                const errs = lineErrors[i] ?? {};
                return (
                  <div
                    key={line.key}
                    className="flex flex-col gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <VariantPicker
                          variants={lookups.data?.variants ?? []}
                          selected={line.variant}
                          onSelect={(v) => updateLine(line.key, { variant: v })}
                          error={errs.variant_id}
                        />
                      </div>
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          aria-label="Remove line"
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                          className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600 dark:hover:bg-stone-800"
                        >
                          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Quantity"
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        placeholder="e.g. 200"
                        error={errs.qty}
                      />
                      <Input
                        label="Unit cost (USD, optional)"
                        type="number"
                        step="0.01"
                        min={0}
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                        placeholder="e.g. 4.25"
                        error={errs.unit_cost}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {submitError ? <ErrorAlert message={submitError} /> : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => router.push("/orders")} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create purchase order
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
