import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { radius, spacing, useTheme } from "@/theme/tokens";

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  /** Remove the default inner padding (e.g. for image-bleed cards). */
  flush?: boolean;
}

export function Card({ style, flush = false, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        !flush && styles.padded,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  padded: {
    padding: spacing(4),
  },
});
