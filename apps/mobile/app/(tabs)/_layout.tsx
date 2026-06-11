import { can } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSession } from "@/lib/auth";
import { spacing, useTheme } from "@/theme/tokens";

function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.headerAction}>
      <Text style={[styles.headerActionText, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useSession();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" color={color} size={size} />
          ),
          headerRight: can.editPurchaseOrders(role)
            ? () => <HeaderAction label="+ New PO" onPress={() => router.push("/order/new")} />
            : undefined,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetags-outline" color={color} size={size} />
          ),
          headerRight: can.editCatalog(role)
            ? () => <HeaderAction label="+ New style" onPress={() => router.push("/style/new")} />
            : undefined,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(1),
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
