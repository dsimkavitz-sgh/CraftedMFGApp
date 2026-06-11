"use client";

/** Deterministic placeholder swatch color from a string (style/SKU name). */
const SWATCHES = [
  "bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "bg-sky-200 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  "bg-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "bg-rose-200 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  "bg-violet-200 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
] as const;

function swatchFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return SWATCHES[Math.abs(hash) % SWATCHES.length] ?? SWATCHES[0];
}

/**
 * Product photo, or a colored swatch with the first letter when no photo
 * exists yet. Square, sized via className (defaults to a small thumb).
 */
export function ProductThumb({
  src,
  alt,
  seed,
  className = "h-10 w-10",
  rounded = "rounded-lg",
}: {
  src: string | null | undefined;
  alt: string;
  seed: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} ${rounded} shrink-0 border border-stone-200 object-cover dark:border-stone-800`}
      />
    );
  }
  return (
    <div
      aria-label={alt}
      className={`${className} ${rounded} flex shrink-0 items-center justify-center text-sm font-semibold uppercase ${swatchFor(seed)}`}
    >
      {seed.trim().charAt(0) || "?"}
    </div>
  );
}
