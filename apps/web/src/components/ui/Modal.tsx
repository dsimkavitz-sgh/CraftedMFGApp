"use client";

import { useEffect } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the dialog. */
  widthClass?: string;
}

/**
 * Accessible modal: Escape and backdrop-click close it; renders as a bottom
 * sheet on small screens and a centered dialog from `sm` up.
 */
export function Modal({ open, onClose, title, children, footer, widthClass = "sm:max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-900 sm:rounded-2xl ${widthClass}`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
          <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
