"use client";

import { useMemo, useState } from "react";
import type { InventoryListItem } from "@crafted/shared";
import { ProductThumb } from "@/components/ProductThumb";

/**
 * Searchable variant selector for PO line items: type to filter by SKU,
 * style, color or size; click a result to select it.
 */
export function VariantPicker({
  variants,
  selected,
  onSelect,
  error,
}: {
  variants: InventoryListItem[];
  selected: InventoryListItem | null;
  onSelect: (variant: InventoryListItem | null) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? variants.filter((v) => {
          const styleName = v.style?.name ?? "";
          return (
            v.sku.toLowerCase().includes(q) ||
            styleName.toLowerCase().includes(q) ||
            v.color.toLowerCase().includes(q) ||
            v.size.toLowerCase().includes(q)
          );
        })
      : variants;
    return matches.slice(0, 8);
  }, [variants, query]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-800/60">
        <ProductThumb
          src={selected.photo_url}
          alt={selected.sku}
          seed={selected.style?.name ?? selected.sku}
          className="h-9 w-9"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
            {selected.sku}
          </p>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {selected.style?.name ?? "Unknown style"} · {selected.color} / {selected.size}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
            setOpen(true);
          }}
          className="shrink-0 text-xs font-medium text-stone-900 hover:underline dark:text-stone-100"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder="Search SKU, style, color…"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so option clicks register before the list unmounts.
          setTimeout(() => setOpen(false), 150);
        }}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 dark:bg-stone-900 dark:text-stone-100 ${
          error ? "border-rose-500" : "border-stone-300 dark:border-stone-700"
        }`}
      />
      {error ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400">No variants match</li>
          ) : (
            results.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(v);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <ProductThumb src={v.photo_url} alt={v.sku} seed={v.style?.name ?? v.sku} className="h-8 w-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-100">
                      {v.sku}
                    </span>
                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                      {v.style?.name ?? "Unknown style"} · {v.color} / {v.size}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                    {v.inventory?.qty_on_hand ?? 0} on hand
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
