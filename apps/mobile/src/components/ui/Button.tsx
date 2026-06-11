import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { radius, spacing, useTheme, type Palette } from "@/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Compact paddings for inline placement (cards, headers). */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

function colorsFor(theme: Palette, variant: ButtonVariant, pressed: boolean) {
  switch (variant) {
    case "primary":
      return {
        bg: pressed ? theme.accentPressed : theme.accent,
        fg: "#ffffff",
        border: "transparent",
      };
    case "danger":
      return {
        bg: pressed ? "#be123c" : theme.danger,
        fg: "#ffffff",
        border: "transparent",
      };
    case "secondary":
      return {
        bg: pressed ? theme.border : theme.card,
        fg: theme.text,
        border: theme.border,
      };
    case "ghost":
      return {
        bg: pressed ? theme.border : "transparent",
        fg: theme.accent,
        border: "transparent",
      };
  }
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  small = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => {
        const c = colorsFor(theme, variant, pressed && !blocked);
        return [
          styles.base,
          small ? styles.small : styles.regular,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            opacity: blocked && !loading ? 0.5 : 1,
          },
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colorsFor(theme, variant, false).fg} />
      ) : (
        <Text
          style={[
            styles.label,
            small && styles.labelSmall,
            { color: colorsFor(theme, variant, false).fg },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  regular: {
    minHeight: 50,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  small: {
    minHeight: 36,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  labelSmall: {
    fontSize: 14,
  },
});
