"use client";

import { useState } from "react";
import {
  listSuppliers,
  styleSchema,
  type StyleInput,
  type StyleRow,
} from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAsync } from "@/lib/useAsync";
import { emptyToNull, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { PhotoUpload } from "@/components/PhotoUpload";

/**
 * Create/edit form for a style (validates with the shared styleSchema).
 * Loads the supplier list itself; the parent performs the actual mutation.
 */
export function StyleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: StyleRow;
  submitLabel: string;
  onSubmit: (input: StyleInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const supabase = getSupabaseBrowserClient();
  const suppliers = useAsync(() => listSuppliers(supabase), []);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [supplierId, setSupplierId] = useState(initial?.supplier_id ?? "");
  const [heroPhotoUrl, setHeroPhotoUrl] = useState<string | null>(initial?.hero_photo_url ?? null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const parsed = styleSchema.safeParse({
      name,
      description: emptyToNull(description),
      supplier_id: supplierId === "" ? null : supplierId,
      hero_photo_url: heroPhotoUrl,
      active,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save style");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Classic Trucker"
        error={fieldErrors["name"]}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Materials, fit, story…"
        error={fieldErrors["description"]}
      />
      <Select
        label="Supplier"
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        error={fieldErrors["supplier_id"]}
        hint={suppliers.error ? `Could not load suppliers: ${suppliers.error}` : undefined}
      >
        <option value="">No supplier</option>
        {(suppliers.data ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <PhotoUpload folder="styles" value={heroPhotoUrl} onChange={setHeroPhotoUrl} label="Hero photo" />
      <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-stone-700"
        />
        Active (visible in the catalog by default)
      </label>

      {submitError ? <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p> : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
