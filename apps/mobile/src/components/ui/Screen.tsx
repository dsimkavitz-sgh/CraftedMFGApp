import type { ReactElement, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme/tokens";

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default). Set false for FlatList screens. */
  scroll?: boolean;
  /** Apply default horizontal/vertical padding (default true). */
  padded?: boolean;
  /** Safe-area edges to inset; headers usually handle the top. */
  edges?: Edge[];
  /** Wrap in KeyboardAvoidingView (form screens). */
  keyboard?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ["bottom"],
  keyboard = false,
  refreshControl,
  style,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padded && styles.padding, styles.grow, contentStyle]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.bg }, style]}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  padding: {
    padding: spacing(4),
  },
});
