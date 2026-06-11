import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing, tint, useTheme, type Palette } from "@/theme/tokens";

export type BadgeTone = "neutral" | "success" | "info" | "warn" | "danger" | "accent";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

function toneColor(theme: Palette, tone: BadgeTone): string {
  switch (tone) {
    case "success":
      return theme.success;
    case "info":
      return theme.info;
    case "warn":
      return theme.warn;
    case "danger":
      return theme.danger;
    case "accent":
      return theme.accent;
    case "neutral":
      return theme.muted;
  }
}

export function Badge({ label, tone = "neutral", style }: BadgeProps) {
  const theme = useTheme();
  const color = toneColor(theme, tone);
  return (
    <View style={[styles.badge, { backgroundColor: tint(color, "26") }, style]}>
      <Text numberOfLines={1} style={[styles.text, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
