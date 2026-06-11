import { registerPushToken } from "@crafted/shared";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// TODO(phase2): sending is not wired up yet. Supabase edge functions will
// read push_tokens and call the Expo Push API to notify users about shipment
// status changes (carrier webhooks / track-shipments polling). MVP only
// registers the device token so those notifications have somewhere to go.

/**
 * Registers this device for Expo push notifications and stores the token
 * via the shared API. Returns the token, or null when not available
 * (simulator, permission denied).
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  // EAS project id is present in production builds; guard for bare dev usage.
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const projectId = extra?.eas?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : {},
  );
  const token = tokenResponse.data;

  await registerPushToken(supabase, token, Platform.OS === "ios" ? "ios" : "android");
  return token;
}
