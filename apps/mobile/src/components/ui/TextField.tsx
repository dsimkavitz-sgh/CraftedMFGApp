import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { radius, spacing, useTheme } from "@/theme/tokens";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({ label, error, containerStyle, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.danger : focused ? theme.accent : theme.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: theme.muted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.muted}
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
          { backgroundColor: theme.card, borderColor, color: theme.text },
        ]}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing(3),
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    fontSize: 16,
    minHeight: 48,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  error: {
    fontSize: 13,
    marginTop: spacing(1),
  },
});
