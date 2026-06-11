"use client";

import { useState } from "react";
import {
  adjustInventory,
  inventoryAdjustmentSchema,
  syncInventoryToQbo,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/useAsync";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export interface AdjustTarget {
  variantId: string;
  sku: string;
  color: string;
  size: string;
  qtyOnHand: number;
}

/**
 * +/- delta stepper with a required reason. Calls the atomic
 * adjust_inventory RPC, then fires the QBO sync without blocking the UI —
 * sync failures land in the admin sync log.
 */
export function AdjustInventoryModal({
  target,
  onClose,
  onAdjusted,
}: {
  target: AdjustTarget;
  onClose: () => void;
  onAdjusted: (newQty: number) => void;
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const projected = target.qtyOnHand + delta;

  async function submit() {
    setSubmitError(null);
    const parsed = inventoryAdjustmentSchema.safeParse({
      variant_id: target.variantId,
      delta,
      reason,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const result = await adjustInventory(supabase, parsed.data);
      // Fire-and-forget: QBO failures must never block the adjustment UI.
      if (result.sync_log_id) {
        try {
          void syncInventoryToQbo(supabase, result.sync_log_id).catch(() => {
            /* surfaced in /admin/qbo sync log */
          });
        } catch {
          /* surfaced in /admin/qbo sync log */
        }
      }
      onAdjusted(result.new_qty);
      onClose();
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Adjust inventory">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-stone-50 p-3 text-sm dark:bg-stone-800/60">
          <p className="font-mono text-xs font-medium text-stone-900 dark:text-stone-100">{target.sku}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {target.color} / {target.size} — currently{" "}
            <span className="font-semibold text-stone-700 dark:text-stone-200">{target.qtyOnHand}</span> on hand
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Quantity change</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" aria-label="Decrease" onClick={() => setDelta((d) => d - 1)}>
              −
            </Button>
            <input
              type="number"
              value={delta}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setDelta(Number.isNaN(n) ? 0 : n);
              }}
              className="w-24 rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-sm font-semibold text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              aria-label="Quantity change"
            />
            <Button variant="secondary" size="sm" aria-label="Increase" onClick={() => setDelta((d) => d + 1)}>
              +
            </Button>
            <span
              className={`ml-2 text-sm font-medium ${projected < 0 ? "text-rose-600 dark:text-rose-400" : "text-stone-500 dark:text-stone-400"}`}
            >
              → {projected} on hand
            </span>
          </div>
          {fieldErrors["delta"] ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{fieldErrors["delta"]}</p>
          ) : null}
        </div>

        <Textarea
          label="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Cycle count correction, damaged units, received PO-2026-014…"
          error={fieldErrors["reason"]}
        />

        {submitError ? <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            Save adjustment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
