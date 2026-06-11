/** Best-effort human-readable message from an unknown thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  if (e && typeof e === "object") {
    const maybe = e as { message?: unknown; error_description?: unknown };
    if (typeof maybe.message === "string" && maybe.message) return maybe.message;
    if (typeof maybe.error_description === "string" && maybe.error_description) {
      return maybe.error_description;
    }
  }
  return "Something went wrong. Please try again.";
}
