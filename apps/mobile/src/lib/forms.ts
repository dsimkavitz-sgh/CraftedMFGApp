import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into { "path.to.field": "first message" }. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Today as YYYY-MM-DD (matches the shared date-string schemas). */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
