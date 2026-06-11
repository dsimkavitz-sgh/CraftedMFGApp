"use client";

const SIZES = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

export function Spinner({ size = "md", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100 ${SIZES[size]} ${className}`}
    />
  );
}

/** Centered spinner for page/section loading states. */
export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-stone-500 dark:text-stone-400">
      <Spinner size="lg" />
      <span>{label}</span>
    </div>
  );
}
