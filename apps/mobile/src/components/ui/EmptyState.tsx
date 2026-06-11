import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, useTheme } from "@/theme/tokens";

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  action?: ReactNode;
}

export function EmptyState({ title, message, icon = "file-tray-outline", action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={44} color={theme.muted} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.muted }]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(8),
    gap: spacing(2),
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing(1),
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    marginTop: spacing(2),
  },
});
