"use client";

import { useState } from "react";
import Link from "next/link";
import {
  can,
  createVariant,
  getStyle,
  updateStyle,
  variantSchema,
  type VariantWithInventory,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { useRole } from "@/components/providers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductThumb } from "@/components/ProductThumb";
import { PhotoUpload } from "@/components/PhotoUpload";
import { StyleForm } from "@/components/StyleForm";
import { AdjustInventoryModal, type AdjustTarget } from "@/components/AdjustInventoryModal";

function AddVariantModal({
  styleId,
  styleName,
  onClose,
  onCreated,
}: {
  styleId: string;
  styleName: string;
  onClose: () => void;
  onCreated: (sku: string) => void;
}) {
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSubmitError(null);
    const parsed = variantSchema.safeParse({
      style_id: styleId,
      color,
      size,
      photo_url: photoUrl,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const created = await createVariant(getSupabaseBrowserClient(), styleName, parsed.data);
      onCreated(created.sku);
      onClose();
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add variant">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          The SKU is generated automatically from the style and color (e.g. CM-CLA-NAV-001).
        </p>
        <Input
          label="Color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="e.g. Navy"
          error={fieldErrors["color"]}
        />
        <Input
          label="Size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g. OS, S/M, L/XL"
          error={fieldErrors["size"]}
        />
        <PhotoUpload folder="variants" value={photoUrl} onChange={setPhotoUrl} label="Photo" />
        {submitError ? <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            Create variant
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function StyleDetailPage({ styleId }: { styleId: string }) {
  const role = useRole();
  const supabase = getSupabaseBrowserClient();
  const state = useAsync(() => getStyle(supabase, styleId), [styleId]);

  const [editOpen, setEditOpen] = useState(false);
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [createdSku, setCreatedSku] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);

  const canEdit = can.editCatalog(role);
  const style = state.data;

  function applyAdjustedQty(variantId: string, newQty: number) {
    state.setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variants: prev.variants.map((v): VariantWithInventory => {
          if (v.id !== variantId) return v;
          return {
            ...v,
            inventory: v.inventory
              ? { ...v.inventory, qty_on_hand: newQty }
              : {
                  variant_id: variantId,
                  qty_on_hand: newQty,
                  location: null,
                  updated_at: new Date().toISOString(),
                },
          };
        }),
      };
    });
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/catalog" className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
          ← Back to catalog
        </Link>
      </div>

      {state.loading && !style ? <LoadingBlock /> : null}
      {state.error ? <ErrorAlert message={state.error} onRetry={state.reload} /> : null}

      {style ? (
        <div className="flex flex-col gap-6">
          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800 sm:w-72 sm:shrink-0">
                {style.hero_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={style.hero_photo_url} alt={style.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-300 dark:from-stone-900 dark:to-stone-700">
                    <span className="text-5xl font-semibold text-stone-500/70 dark:text-stone-400/50">
                      {style.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                    {style.name}
                  </h1>
                  <Badge tone={style.active ? "emerald" : "stone"}>
                    {style.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {style.supplier?.name ?? "No supplier"}
                </p>
                {style.description ? (
                  <p className="text-sm text-stone-600 dark:text-stone-300">{style.description}</p>
                ) : null}
                {canEdit ? (
                  <div className="mt-auto pt-3">
                    <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                      Edit style
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          {createdSku ? <SuccessAlert message={`Variant created with SKU ${createdSku}.`} /> : null}

          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
              <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Variants ({style.variants.length})
              </h2>
              {canEdit ? (
                <Button size="sm" onClick={() => setAddVariantOpen(true)}>
                  Add variant
                </Button>
              ) : null}
            </div>

            {style.variants.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No variants yet"
                  description="Add a color/size combination — the SKU is generated for you."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                      <th className="px-4 py-2.5 sm:px-6">Variant</th>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Color</th>
                      <th className="px-4 py-2.5">Size</th>
                      <th className="px-4 py-2.5 text-right">On hand</th>
                      <th className="px-4 py-2.5">Location</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {style.variants.map((v) => {
                      const qty = v.inventory?.qty_on_hand ?? 0;
                      return (
                        <tr key={v.id}>
                          <td className="px-4 py-2.5 sm:px-6">
                            <ProductThumb src={v.photo_url} alt={v.sku} seed={style.name} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                            {v.sku}
                          </td>
                          <td className="px-4 py-2.5 text-stone-700 dark:text-stone-300">{v.color}</td>
                          <td className="px-4 py-2.5 text-stone-700 dark:text-stone-300">{v.size}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge tone={qty <= 0 ? "rose" : qty < 25 ? "amber" : "emerald"}>{qty}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-stone-500 dark:text-stone-400">
                            {v.inventory?.location ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {can.adjustInventory(role) ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setAdjustTarget({
                                    variantId: v.id,
                                    sku: v.sku,
                                    color: v.color,
                                    size: v.size,
                                    qtyOnHand: qty,
                                  })
                                }
                              >
                                Adjust
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {style && editOpen ? (
        <Modal open onClose={() => setEditOpen(false)} title="Edit style">
          <StyleForm
            initial={style}
            submitLabel="Save changes"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (input) => {
              await updateStyle(supabase, style.id, input);
              setEditOpen(false);
              state.reload();
            }}
          />
        </Modal>
      ) : null}

      {style && addVariantOpen ? (
        <AddVariantModal
          styleId={style.id}
          styleName={style.name}
          onClose={() => setAddVariantOpen(false)}
          onCreated={(sku) => {
            setCreatedSku(sku);
            state.reload();
          }}
        />
      ) : null}

      {adjustTarget ? (
        <AdjustInventoryModal
          target={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onAdjusted={(newQty) => applyAdjustedQty(adjustTarget.variantId, newQty)}
        />
      ) : null}
    </div>
  );
}
