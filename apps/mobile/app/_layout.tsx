import { Comfortaa_700Bold, useFonts } from "@expo-google-fonts/comfortaa";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SessionProvider, useSession } from "@/lib/auth";
import { useTheme } from "@/theme/tokens";

// Keep the splash visible until fonts + the persisted session are restored.
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const theme = useTheme();
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  // Brand wordmark font (see components/BrandWordmark.tsx).
  const [fontsLoaded] = useFonts({ Comfortaa_700Bold });

  useEffect(() => {
    if (loading || !fontsLoaded) return;
    void SplashScreen.hideAsync();
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [loading, fontsLoaded, session, segments, router]);

  // Show nothing (splash stays up) until fonts and session state are known.
  if (loading || !fontsLoaded) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.accent,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="variant/[id]" options={{ title: "Variant" }} />
      <Stack.Screen
        name="order/new"
        options={{ title: "New Purchase Order", presentation: "modal" }}
      />
      <Stack.Screen name="order/[id]" options={{ title: "Purchase Order" }} />
      <Stack.Screen name="style/new" options={{ title: "New Style", presentation: "modal" }} />
      <Stack.Screen name="style/[id]" options={{ title: "Style" }} />
      <Stack.Screen name="scan" options={{ title: "Scan Barcode", presentation: "modal" }} />
      <Stack.Screen name="admin/qbo" options={{ title: "Admin Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SessionProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
