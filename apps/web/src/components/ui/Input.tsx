"use client";

import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_CLASSES =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500";

function FieldWrap({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-xs font-medium text-stone-600 dark:text-stone-400">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-stone-400 dark:text-stone-500">{hint}</p> : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = "", ...rest }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap id={fieldId} label={label} error={error} hint={hint}>
      <input
        id={fieldId}
        className={`${FIELD_CLASSES} ${error ? "border-rose-500" : ""} ${className}`}
        {...rest}
      />
    </FieldWrap>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, id, className = "", children, ...rest }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap id={fieldId} label={label} error={error} hint={hint}>
      <select
        id={fieldId}
        className={`${FIELD_CLASSES} ${error ? "border-rose-500" : ""} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, id, className = "", ...rest }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap id={fieldId} label={label} error={error} hint={hint}>
      <textarea
        id={fieldId}
        rows={3}
        className={`${FIELD_CLASSES} ${error ? "border-rose-500" : ""} ${className}`}
        {...rest}
      />
    </FieldWrap>
  );
}
