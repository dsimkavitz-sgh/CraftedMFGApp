"use client";

import { useState } from "react";
import {
  SUPPLIER_TYPES,
  can,
  createSupplier,
  deleteSupplier,
  listSuppliers,
  supplierSchema,
  updateSupplier,
  type SupplierRow,
  type SupplierType,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { emptyToNull, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { useRole } from "@/components/providers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

const TYPE_LABELS: Record<SupplierType, string> = {
  hat_manufacturer: "Hat manufacturer",
  patch_manufacturer: "Patch manufacturer",
};

type TriState = "unknown" | "yes" | "no";

function triFromBool(value: boolean | null | undefined): TriState {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function boolFromTri(value: TriState): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function SupplierFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: SupplierRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<SupplierType>(initial?.type ?? "hat_manufacturer");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [alibabaRef, setAlibabaRef] = useState(initial?.alibaba_reference ?? "");
  const [tradeAssurance, setTradeAssurance] = useState<TriState>(
    triFromBool(initial?.uses_trade_assurance),
  );
  const [contactNotes, setContactNotes] = useState(initial?.contact_notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSubmitError(null);
    const parsed = supplierSchema.safeParse({
      name,
      type,
      country: emptyToNull(country),
      alibaba_reference: emptyToNull(alibabaRef),
      uses_trade_assurance: boolFromTri(tradeAssurance),
      contact_notes: emptyToNull(contactNotes),
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
        await updateSupplier(supabase, initial.id, parsed.data);
      } else {
        await createSupplier(supabase, parsed.data);
      }
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit supplier" : "New supplier"}>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Golden Crown Headwear Co."
          error={fieldErrors["name"]}
        />
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as SupplierType)}
          error={fieldErrors["type"]}
        >
          {SUPPLIER_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="e.g. China"
          error={fieldErrors["country"]}
        />
        <Input
          label="Alibaba reference"
          value={alibabaRef}
          onChange={(e) => setAlibabaRef(e.target.value)}
          placeholder="Store / listing URL or ID"
          error={fieldErrors["alibaba_reference"]}
        />
        <Select
          label="Uses Trade Assurance"
          value={tradeAssurance}
          onChange={(e) => setTradeAssurance(e.target.value as TriState)}
        >
          <option value="unknown">Unknown</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
        <Textarea
          label="Contact notes"
          value={contactNotes}
          onChange={(e) => setContactNotes(e.target.value)}
          placeholder="Contact person, WeChat/WhatsApp, lead times…"
          error={fieldErrors["contact_notes"]}
        />
        {submitError ? <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            {initial ? "Save changes" : "Create supplier"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function SuppliersPage() {
  const role = useRole();
  const supabase = getSupabaseBrowserClient();
  const state = useAsync(() => listSuppliers(supabase), []);

  const [modal, setModal] = useState<{ open: boolean; supplier: SupplierRow | null }>({
    open: false,
    supplier: null,
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = can.editSuppliers(role);

  async function handleDelete(supplier: SupplierRow) {
    if (!window.confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    setDeletingId(supplier.id);
    try {
      await deleteSupplier(supabase, supplier.id);
      state.reload();
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Manufacturers you source hats and patches from."
        actions={
          canEdit ? (
            <Button onClick={() => setModal({ open: true, supplier: null })}>New supplier</Button>
          ) : undefined
        }
      />

      {deleteError ? (
        <div className="mb-4">
          <ErrorAlert message={deleteError} />
        </div>
      ) : null}

      {state.loading && !state.data ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {state.data && state.data.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add the manufacturers you order from."
          action={
            canEdit ? (
              <Button size="sm" onClick={() => setModal({ open: true, supplier: null })}>
                New supplier
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {state.data && state.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {state.data.map((s) => (
            <Card key={s.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                    {s.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {TYPE_LABELS[s.type]}
                    {s.country ? ` · ${s.country}` : ""}
                  </p>
                </div>
                <Badge tone={s.uses_trade_assurance === true ? "emerald" : s.uses_trade_assurance === false ? "rose" : "stone"}>
                  {s.uses_trade_assurance === true
                    ? "Trade Assurance"
                    : s.uses_trade_assurance === false
                      ? "No Trade Assurance"
                      : "TA unknown"}
                </Badge>
              </div>
              {s.alibaba_reference ? (
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                  Alibaba: {s.alibaba_reference}
                </p>
              ) : null}
              {s.contact_notes ? (
                <p className="line-clamp-3 whitespace-pre-line text-xs text-stone-600 dark:text-stone-300">
                  {s.contact_notes}
                </p>
              ) : null}
              {canEdit ? (
                <div className="mt-auto flex justify-end gap-2 pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === s.id}
                    onClick={() => void handleDelete(s)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModal({ open: true, supplier: s })}
                  >
                    Edit
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {modal.open ? (
        <SupplierFormModal
          initial={modal.supplier}
          onClose={() => setModal({ open: false, supplier: null })}
          onSaved={state.reload}
        />
      ) : null}
    </div>
  );
}
