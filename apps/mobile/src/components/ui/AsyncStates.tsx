import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { spacing, useTheme } from "@/theme/tokens";
import { Button } from "./Button";

export function LoadingView() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );
}

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Couldn't load</Text>
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" small onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(8),
    gap: spacing(2.5),
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
