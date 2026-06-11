import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing, tint, useTheme } from "@/theme/tokens";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SelectSheetProps {
  /** Field label above the trigger (form mode). */
  label?: string;
  /** Sheet title; falls back to label/placeholder. */
  title?: string;
  placeholder?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  /** Show a "Clear selection" row in the sheet. */
  allowClear?: boolean;
  error?: string | null;
  disabled?: boolean;
  /** Render the trigger as a compact filter chip. */
  chip?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SelectSheet({
  label,
  title,
  placeholder = "Select…",
  value,
  options,
  onChange,
  allowClear = false,
  error,
  disabled = false,
  chip = false,
  style,
}: SelectSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  const trigger = chip ? (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => setOpen(true)}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? tint(theme.accent) : theme.card,
          borderColor: selected ? theme.accent : theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, { color: selected ? theme.accent : theme.muted }]}
      >
        {selected ? selected.label : placeholder}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={selected ? theme.accent : theme.muted}
      />
    </Pressable>
  ) : (
    <View style={style}>
      {label ? <Text style={[styles.label, { color: theme.muted }]}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.control,
          {
            backgroundColor: theme.card,
            borderColor: error ? theme.danger : theme.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.controlText, { color: selected ? theme.text : theme.muted }]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.muted} />
      </Pressable>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );

  return (
    <>
      {trigger}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, paddingBottom: insets.bottom + spacing(4) },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text style={[styles.sheetTitle, { color: theme.text }]}>
            {title ?? label ?? placeholder}
          </Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            style={styles.list}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.muted }]}>No options available</Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && { backgroundColor: theme.bg },
                  ]}
                >
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionLabel, { color: theme.text }]}>{item.label}</Text>
                    {item.sublabel ? (
                      <Text style={[styles.optionSublabel, { color: theme.muted }]}>
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={20} color={theme.accent} />
                  ) : null}
                </Pressable>
              );
            }}
          />
          {allowClear && value !== null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
              style={styles.clearRow}
            >
              <Text style={[styles.clearText, { color: theme.danger }]}>Clear selection</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  control: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing(3.5),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlText: {
    fontSize: 16,
    flex: 1,
    marginRight: spacing(2),
  },
  error: {
    fontSize: 13,
    marginTop: spacing(1),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 160,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingTop: spacing(2),
    paddingHorizontal: spacing(4),
    maxHeight: "70%",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing(3),
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: spacing(2),
  },
  list: {
    flexGrow: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing(3),
    borderRadius: radius.control,
    paddingHorizontal: spacing(1),
  },
  optionTextWrap: {
    flex: 1,
    marginRight: spacing(2),
  },
  optionLabel: {
    fontSize: 16,
  },
  optionSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    fontSize: 14,
    paddingVertical: spacing(4),
    textAlign: "center",
  },
  clearRow: {
    paddingVertical: spacing(3),
    alignItems: "center",
  },
  clearText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
