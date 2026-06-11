import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing, useTheme } from "@/theme/tokens";

interface QtyStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Lowest allowed value; omit to allow negatives (e.g. adjustment deltas). */
  min?: number;
  max?: number;
  step?: number;
  style?: StyleProp<ViewStyle>;
}

export function QtyStepper({ value, onChange, min, max, step = 1, style }: QtyStepperProps) {
  const theme = useTheme();
  const canDecrement = min === undefined || value - step >= min;
  const canIncrement = max === undefined || value + step <= max;

  const StepButton = ({
    icon,
    enabled,
    onPress,
    label,
  }: {
    icon: "remove" | "add";
    enabled: boolean;
    onPress: () => void;
    label: string;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.border : theme.card,
          opacity: enabled ? 1 : 0.35,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.text} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.card }, style]}>
      <StepButton
        icon="remove"
        label="Decrease quantity"
        enabled={canDecrement}
        onPress={() => onChange(value - step)}
      />
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <StepButton
        icon="add"
        label="Increase quantity"
        enabled={canIncrement}
        onPress={() => onChange(value + step)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.control,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  button: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.5),
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    minWidth: 56,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
