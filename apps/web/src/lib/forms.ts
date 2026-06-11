import type { z } from "zod";

/** First error message per top-level field, keyed by field name. */
export type FieldErrors = Record<string, string | undefined>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === undefined) {
      if (out["_form"] === undefined) out["_form"] = issue.message;
      continue;
    }
    const name = String(key);
    if (out[name] === undefined) out[name] = issue.message;
  }
  return out;
}

/** "" → null, otherwise the trimmed string (for nullable optional text fields). */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
