import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_PHOTOS_BUCKET = "product-photos";

/**
 * Unique storage filename. Web has crypto.randomUUID(); React Native's
 * Hermes runtime has no global crypto, so fall back to time + randomness
 * (plenty for filename uniqueness — real collision safety comes from the
 * storage upsert:false flag).
 */
function uniqueId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Uploads a product photo and returns its public URL.
 * Web passes a File/Blob; mobile passes an ArrayBuffer read from the
 * camera/library URI (expo-file-system) with an explicit contentType.
 */
export async function uploadProductPhoto(
  supabase: SupabaseClient,
  body: Blob | ArrayBuffer,
  opts: { folder: "styles" | "variants"; fileName: string; contentType?: string },
): Promise<string> {
  const ext = opts.fileName.includes(".") ? opts.fileName.split(".").pop() : "jpg";
  const path = `${opts.folder}/${uniqueId()}.${ext}`;
  const { error } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).upload(path, body, {
    contentType: opts.contentType ?? "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PRODUCT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
