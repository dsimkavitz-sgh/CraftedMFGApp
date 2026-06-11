"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CARRIERS,
  CARRIER_LABELS,
  MANUFACTURING_STAGES,
  PO_STATUSES,
  PO_STATUS_LABELS,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  STAGE_LABELS,
  can,
  carrierTrackingUrl,
  createShipment,
  currentStage,
  deleteShipment,
  formatCurrency,
  formatDate,
  formatDateTime,
  getPurchaseOrder,
  isManufacturingStage,
  listStageHistory,
  listSuppliers,
  nextStage,
  purchaseOrderSchema,
  recordStageEvent,
  shipmentSchema,
  stageEventSchema,
  sumQty,
  updatePurchaseOrder,
  updateShipment,
  type Carrier,
  type ManufacturingStage,
  type PoStatus,
  type PurchaseOrderWithRelations,
  type ShipmentRow,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { emptyToNull, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { useRole } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductThumb } from "@/components/ProductThumb";
import { PoStatusBadge, ShipmentStatusBadge } from "@/components/StatusBadge";
import { StageStepper } from "@/components/StageStepper";

const CARRIER_BADGE: Record<Carrier, string> = {
  ups: "bg-amber-950 text-amber-100",
  fedex: "bg-purple-800 text-white",
  dhl: "bg-yellow-400 text-yellow-950",
};

function EditPoModal({
  po,
  onClose,
  onSaved,
}: {
  po: PurchaseOrderWithRelations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getSupabaseBrowserClient();
  const suppliers = useAsync(() => listSuppliers(supabase), []);

  const [poNumber, setPoNumber] = useState(po.po_number);
  const [supplierId, setSupplierId] = useState(po.supplier_id);
  const [orderDate, setOrderDate] = useState(po.order_date);
  const [eta, setEta] = useState(po.eta ?? "");
  const [status, setStatus] = useState<PoStatus>(po.status);
  const [notes, setNotes] = useState(po.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSubmitError(null);
    const parsed = purchaseOrderSchema.omit({ line_items: true }).safeParse({
      po_number: poNumber,
      supplier_id: supplierId,
      order_date: orderDate,
      eta: emptyToNull(eta),
      status,
      notes: emptyToNull(notes),
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      await updatePurchaseOrder(supabase, po.id, parsed.data);
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit purchase order">
      <div className="flex flex-col gap-4">
        <Input
          label="PO number"
          value={poNumber}
          onChange={(e) => setPoNumber(e.target.value)}
          error={fieldErrors["po_number"]}
        />
        <Select
          label="Supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          error={fieldErrors["supplier_id"]}
        >
          {(suppliers.data ?? (po.supplier ? [po.supplier] : [])).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
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
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PoStatus)}
          error={fieldErrors["status"]}
        >
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PO_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          error={fieldErrors["notes"]}
        />
        {submitError ? <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ShipmentFormModal({
  poId,
  initial,
  onClose,
  onSaved,
}: {
  poId: string;
  initial: ShipmentRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [carrier, setCarrier] = useState<Carrier>(initial?.carrier ?? "ups");
  const [trackingNumber, setTrackingNumber] = useState(initial?.tracking_number ?? "");
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [eta, setEta] = useState(initial?.eta ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSubmitError(null);
    const parsed = shipmentSchema.safeParse({
      po_id: poId,
      carrier,
      tracking_number: trackingNumber,
      status,
      eta: emptyToNull(eta),
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    try {
      if (initial) {
        const { po_id: _poId, ...rest } = parsed.data;
        await updateShipment(supabase, initial.id, rest);
      } else {
        await createShipment(supabase, parsed.data);
      }
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit shipment" : "Add shipment"}>
      <div className="flex flex-col gap-4">
        <Select label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {CARRIER_LABELS[c]}
            </option>
          ))}
        </Select>
        <Input
          label="Tracking number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="e.g. 1Z999AA10123456784"
          error={fieldErrors["tracking_number"]}
        />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SHIPMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Input
          label="ETA"
          type="date"
          value={eta}
          onChange={(e) => setEta(e.target.value)}
          error={fieldErrors["eta"]}
        />
        {submitError ? <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            {initial ? "Save changes" : "Add shipment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function OrderDetailPage({ poId }: { poId: string }) {
  const role = useRole();
  const supabase = getSupabaseBrowserClient();

  const state = useAsync(async () => {
    const [po, history] = await Promise.all([
      getPurchaseOrder(supabase, poId),
      listStageHistory(supabase, poId),
    ]);
    return { po, history };
  }, [poId]);

  const [editOpen, setEditOpen] = useState(false);
  const [stageNote, setStageNote] = useState("");
  const [jumpStage, setJumpStage] = useState<"" | ManufacturingStage>("");
  const [stageError, setStageError] = useState<string | null>(null);
  const [recordingStage, setRecordingStage] = useState(false);
  const [shipmentModal, setShipmentModal] = useState<{ open: boolean; shipment: ShipmentRow | null }>({
    open: false,
    shipment: null,
  });
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [shipmentBusyId, setShipmentBusyId] = useState<string | null>(null);

  const po = state.data?.po ?? null;
  const history = state.data?.history ?? [];
  const stage = po ? currentStage(po) : null;
  const next = stage ? nextStage(stage) : (MANUFACTURING_STAGES[0] ?? null);

  async function recordStage(target: ManufacturingStage) {
    if (!po) return;
    setStageError(null);
    const parsed = stageEventSchema.safeParse({
      po_id: po.id,
      stage: target,
      note: emptyToNull(stageNote),
    });
    if (!parsed.success) {
      setStageError(parsed.error.issues[0]?.message ?? "Invalid stage event");
      return;
    }
    setRecordingStage(true);
    try {
      await recordStageEvent(supabase, parsed.data);
      setStageNote("");
      setJumpStage("");
      state.reload();
    } catch (e) {
      setStageError(errorMessage(e));
    } finally {
      setRecordingStage(false);
    }
  }

  async function setShipmentStatus(shipment: ShipmentRow, status: string) {
    setShipmentError(null);
    setShipmentBusyId(shipment.id);
    try {
      await updateShipment(supabase, shipment.id, { status });
      state.reload();
    } catch (e) {
      setShipmentError(errorMessage(e));
    } finally {
      setShipmentBusyId(null);
    }
  }

  async function removeShipment(shipment: ShipmentRow) {
    if (!window.confirm(`Delete ${CARRIER_LABELS[shipment.carrier]} shipment ${shipment.tracking_number}?`))
      return;
    setShipmentError(null);
    setShipmentBusyId(shipment.id);
    try {
      await deleteShipment(supabase, shipment.id);
      state.reload();
    } catch (e) {
      setShipmentError(errorMessage(e));
    } finally {
      setShipmentBusyId(null);
    }
  }

  const totalCost = po
    ? po.line_items.reduce((acc, li) => acc + (li.unit_cost ?? 0) * li.qty, 0)
    : 0;
  const hasCosts = po ? po.line_items.some((li) => li.unit_cost != null) : false;

  return (
    <div>
      <div className="mb-4">
        <Link href="/orders" className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
          ← Back to orders
        </Link>
      </div>

      {state.loading && !state.data ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {po ? (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                    {po.po_number}
                  </h1>
                  <PoStatusBadge status={po.status} />
                </div>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {po.supplier?.name ?? "Unknown supplier"} · Ordered {formatDate(po.order_date)} · ETA{" "}
                  {formatDate(po.eta)}
                </p>
                {po.notes ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-stone-600 dark:text-stone-300">{po.notes}</p>
                ) : null}
              </div>
              {can.editPurchaseOrders(role) ? (
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  Edit PO
                </Button>
              ) : null}
            </div>
          </Card>

          {/* Manufacturing stage */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Manufacturing stage
            </h2>
            <StageStepper current={stage} />
            {can.advanceStages(role) ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
                <Input
                  label="Note (optional)"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="e.g. Samples approved over video call"
                />
                <div className="flex flex-wrap items-end gap-2">
                  {next ? (
                    <Button
                      size="sm"
                      loading={recordingStage}
                      onClick={() => void recordStage(next)}
                    >
                      {stage ? `Advance to ${STAGE_LABELS[next]}` : `Start: ${STAGE_LABELS[next]}`}
                    </Button>
                  ) : (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Final stage reached.
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <Select
                      label="Or jump to"
                      value={jumpStage}
                      onChange={(e) => setJumpStage(e.target.value as "" | ManufacturingStage)}
                      className="w-44"
                    >
                      <option value="">Pick a stage…</option>
                      {MANUFACTURING_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={jumpStage === "" || recordingStage}
                      onClick={() => {
                        if (jumpStage !== "") void recordStage(jumpStage);
                      }}
                      className="mb-0.5"
                    >
                      Record
                    </Button>
                  </div>
                </div>
                {stageError ? <p className="text-sm text-rose-600 dark:text-rose-400">{stageError}</p> : null}
              </div>
            ) : null}

            {/* Stage history */}
            <div className="mt-5 border-t border-stone-200 pt-4 dark:border-stone-800">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Stage history
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-stone-500">No stage events recorded yet.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {history.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-stone-900 dark:bg-stone-100" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                          {isManufacturingStage(event.stage) ? STAGE_LABELS[event.stage] : event.stage}
                        </p>
                        {event.note ? (
                          <p className="text-sm text-stone-600 dark:text-stone-300">{event.note}</p>
                        ) : null}
                        <p className="text-xs text-stone-400 dark:text-stone-500">
                          {event.user?.full_name ?? "Unknown"} · {formatDateTime(event.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>

          {/* Line items */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
              <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Line items
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {sumQty(po.line_items).toLocaleString("en-US")} units
                {hasCosts ? ` · ${formatCurrency(totalCost)}` : ""}
              </p>
            </div>
            {po.line_items.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No line items" />
              </div>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {po.line_items.map((li) => (
                  <li key={li.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <ProductThumb
                      src={li.variant?.photo_url}
                      alt={li.variant?.sku ?? "Line item"}
                      seed={li.variant?.style?.name ?? li.variant?.sku ?? "?"}
                      className="h-12 w-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                        {li.variant?.sku ?? "Unknown variant"}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {li.variant?.style?.name ?? "—"} · {li.variant?.color ?? "?"} / {li.variant?.size ?? "?"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {li.qty.toLocaleString("en-US")} units
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {li.unit_cost != null
                          ? `${formatCurrency(li.unit_cost)} ea · ${formatCurrency(li.unit_cost * li.qty)}`
                          : "No unit cost"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Shipments */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
              <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Shipments
              </h2>
              {can.editShipments(role) ? (
                <Button size="sm" onClick={() => setShipmentModal({ open: true, shipment: null })}>
                  Add shipment
                </Button>
              ) : null}
            </div>

            {shipmentError ? (
              <div className="px-4 pt-3 sm:px-6">
                <ErrorAlert message={shipmentError} />
              </div>
            ) : null}

            {po.shipments.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No shipments yet"
                  description="Add a tracking number when the supplier ships."
                />
              </div>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {po.shipments.map((shipment) => (
                  <li key={shipment.id} className="flex flex-col gap-3 px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold tracking-wide ${CARRIER_BADGE[shipment.carrier]}`}
                      >
                        {CARRIER_LABELS[shipment.carrier]}
                      </span>
                      <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">
                        {shipment.tracking_number}
                      </span>
                      <ShipmentStatusBadge status={shipment.status} />
                      <a
                        href={carrierTrackingUrl(shipment.carrier, shipment.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-xs font-medium text-stone-900 hover:underline dark:text-stone-100"
                      >
                        Track on {CARRIER_LABELS[shipment.carrier]} ↗
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      <span>ETA {formatDate(shipment.eta)}</span>
                      {shipment.last_event_summary ? <span>{shipment.last_event_summary}</span> : null}
                    </div>
                    {can.editShipments(role) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={shipment.status}
                          disabled={shipmentBusyId === shipment.id}
                          onChange={(e) => void setShipmentStatus(shipment, e.target.value)}
                          aria-label="Shipment status"
                          className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                        >
                          {SHIPMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {SHIPMENT_STATUS_LABELS[s]}
                            </option>
                          ))}
                          {!(SHIPMENT_STATUSES as readonly string[]).includes(shipment.status) ? (
                            <option value={shipment.status}>{shipment.status}</option>
                          ) : null}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShipmentModal({ open: true, shipment })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 dark:text-rose-400"
                          loading={shipmentBusyId === shipment.id}
                          onClick={() => void removeShipment(shipment)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500 sm:px-6">
              Phase 2: live UPS/FedEx/DHL tracking events will appear here automatically.
            </p>
          </Card>
        </div>
      ) : null}

      {po && editOpen ? (
        <EditPoModal po={po} onClose={() => setEditOpen(false)} onSaved={state.reload} />
      ) : null}

      {po && shipmentModal.open ? (
        <ShipmentFormModal
          poId={po.id}
          initial={shipmentModal.shipment}
          onClose={() => setShipmentModal({ open: false, shipment: null })}
          onSaved={state.reload}
        />
      ) : null}
    </div>
  );
}
