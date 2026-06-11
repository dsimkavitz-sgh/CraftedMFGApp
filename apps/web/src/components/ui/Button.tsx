"use client";

import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-amber-600 text-white hover:bg-amber-500 disabled:hover:bg-amber-600 shadow-sm",
  secondary:
    "bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-100 dark:border-stone-700 dark:hover:bg-stone-800",
  ghost:
    "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 disabled:hover:bg-rose-600 shadow-sm",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
}
