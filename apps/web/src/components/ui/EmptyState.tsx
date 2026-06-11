"use client";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center dark:border-stone-700">
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-stone-300 dark:text-stone-600" aria-hidden="true">
        <path
          d="M3 14c0-1 .5-2.5 2-4 0-3.5 3-6 7-6s7 2.5 7 6c1.5 1.5 2 3 2 4 0 1.5-1.5 3-4 3H7c-2.5 0-4-1.5-4-3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M7 17v2.5M17 17v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{title}</p>
      {description ? <p className="max-w-sm text-xs text-stone-500 dark:text-stone-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
