import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_PHOTOS_BUCKET = "product-photos";

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
  const path = `${opts.folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).upload(path, body, {
    contentType: opts.contentType ?? "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PRODUCT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
