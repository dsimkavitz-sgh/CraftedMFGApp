import { listInventory, listStyles, listSuppliers } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ErrorView, LoadingView } from "@/components/ui/AsyncStates";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { SelectSheet } from "@/components/ui/SelectSheet";
import { VariantRow } from "@/components/VariantRow";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { radius, spacing, useTheme } from "@/theme/tokens";

export default function InventoryScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const inventory = useAsync(
    () =>
      listInventory(supabase, {
        search: debouncedSearch.trim() || undefined,
        styleId: styleId ?? undefined,
        supplierId: supplierId ?? undefined,
      }),
    [debouncedSearch, styleId, supplierId],
  );
  const styleOptions = useAsync(() => listStyles(supabase, { includeInactive: true }), []);
  const supplierOptions = useAsync(() => listSuppliers(supabase), []);

  const hasFilters = styleId !== null || supplierId !== null;

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.controls}>
        <View
          style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="search" size={18} color={theme.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search SKU, color, size"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
        <View style={styles.chipsRow}>
          <SelectSheet
            chip
            title="Filter by style"
            placeholder="Style"
            value={styleId}
            allowClear
            options={(styleOptions.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            onChange={setStyleId}
          />
          <SelectSheet
            chip
            title="Filter by supplier"
            placeholder="Supplier"
            value={supplierId}
            allowClear
            options={(supplierOptions.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSupplierId}
          />
          {hasFilters ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStyleId(null);
                setSupplierId(null);
              }}
              style={styles.clearChip}
            >
              <Text style={[styles.clearChipText, { color: theme.danger }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {inventory.loading && !inventory.data ? (
        <LoadingView />
      ) : inventory.error && !inventory.data ? (
        <ErrorView message={inventory.error} onRetry={() => void inventory.reload()} />
      ) : (
        <FlatList
          data={inventory.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={inventory.refreshing}
              onRefresh={() => void inventory.refresh()}
              tintColor={theme.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No inventory found"
              message={
                debouncedSearch || hasFilters
                  ? "Try a different search or clear your filters."
                  : "Variants will show up here once your catalog has styles."
              }
            />
          }
          renderItem={({ item }) => (
            <VariantRow
              variant={item}
              styleName={item.style?.name ?? null}
              onPress={() => router.push(`/variant/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
    gap: spacing(2.5),
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing(3),
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing(2),
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    flexWrap: "wrap",
  },
  clearChip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  clearChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(6),
    flexGrow: 1,
  },
});
