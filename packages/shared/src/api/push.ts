import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Registers an Expo push token for the signed-in user. Idempotent per
 * (user, token). Phase 2 sends shipment notifications to these tokens via
 * the Expo Push API from edge functions.
 */
export async function registerPushToken(
  supabase: SupabaseClient,
  expoToken: string,
  platform: "ios" | "android",
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: user.id, expo_token: expoToken, platform },
      { onConflict: "user_id,expo_token" },
    );
  if (error) throw error;
}

export async function unregisterPushToken(
  supabase: SupabaseClient,
  expoToken: string,
): Promise<void> {
  const { error } = await supabase.from("push_tokens").delete().eq("expo_token", expoToken);
  if (error) throw error;
}
