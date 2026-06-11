import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, useTheme } from "@/theme/tokens";

interface SectionHeaderProps {
  title: string;
  /** Optional right-aligned action (e.g. a small Button). */
  action?: ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(5),
    marginBottom: spacing(2.5),
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
});
