import type { VariantWithInventory } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { radius, spacing, tint, useTheme } from "@/theme/tokens";
import { Badge } from "./ui/Badge";

interface VariantRowProps {
  variant: VariantWithInventory;
  /** Shown above the SKU when listing across styles (e.g. inventory). */
  styleName?: string | null;
  onPress?: () => void;
}

export function VariantRow({ variant, styleName, onPress }: VariantRowProps) {
  const theme = useTheme();
  const qty = variant.inventory?.qty_on_hand ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.border : theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {variant.photo_url ? (
        <Image source={{ uri: variant.photo_url }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: tint(theme.accent) }]}>
          <Ionicons name="image-outline" size={20} color={theme.accent} />
        </View>
      )}
      <View style={styles.info}>
        {styleName ? (
          <Text numberOfLines={1} style={[styles.styleName, { color: theme.muted }]}>
            {styleName}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={[styles.sku, { color: theme.text }]}>
          {variant.sku}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>
          {variant.color} · {variant.size}
        </Text>
      </View>
      <Badge label={`${qty}`} tone={qty > 0 ? "success" : "danger"} />
      <Ionicons name="chevron-forward" size={16} color={theme.muted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginHorizontal: spacing(3),
  },
  styleName: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sku: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
  },
  meta: {
    fontSize: 13,
    marginTop: 1,
  },
  chevron: {
    marginLeft: spacing(2),
  },
});
