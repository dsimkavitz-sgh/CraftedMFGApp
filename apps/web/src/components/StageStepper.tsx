"use client";

import { MANUFACTURING_STAGES, STAGE_LABELS, stageIndex } from "@crafted/shared";

/**
 * Horizontal manufacturing-stage stepper. `current` is the latest stage event
 * value (or null if production hasn't started). Completed stages get a check,
 * the current one is filled ink, future ones are muted.
 */
export function StageStepper({ current }: { current: string | null }) {
  const currentIdx = current ? stageIndex(current) : -1;

  return (
    <ol className="flex w-full items-start overflow-x-auto pb-1">
      {MANUFACTURING_STAGES.map((stage, i) => {
        const state: "done" | "current" | "future" =
          i < currentIdx ? "done" : i === currentIdx ? "current" : "future";
        const isLast = i === MANUFACTURING_STAGES.length - 1;
        return (
          <li key={stage} className={`flex min-w-[72px] flex-col items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : i <= currentIdx ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-200 dark:bg-stone-700"}`} />
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  state === "done"
                    ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                    : state === "current"
                      ? "border-stone-900 bg-white text-stone-900 dark:border-stone-100 dark:bg-stone-900 dark:text-stone-100"
                      : "border-stone-300 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500"
                }`}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className={`h-0.5 flex-1 ${isLast ? "bg-transparent" : i < currentIdx ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-200 dark:bg-stone-700"}`} />
            </div>
            <span
              className={`mt-1.5 px-1 text-center text-[11px] leading-tight ${
                state === "current"
                  ? "font-semibold text-stone-900 dark:text-stone-100"
                  : state === "done"
                    ? "font-medium text-stone-700 dark:text-stone-300"
                    : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
