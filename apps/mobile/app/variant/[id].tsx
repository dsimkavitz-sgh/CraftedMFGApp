import {
  adjustInventory,
  can,
  formatDateTime,
  inventoryAdjustmentSchema,
  listAdjustments,
  listInventory,
  syncInventoryToQbo,
  type AdjustmentWithRelations,
  type InventoryListItem,
} from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/ui/AsyncStates";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextField } from "@/components/ui/TextField";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { radius, spacing, tint, useTheme } from "@/theme/tokens";

interface VariantDetailData {
  variant: InventoryListItem | null;
  adjustments: AdjustmentWithRelations[];
}

export default function VariantDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const variantId = typeof params.id === "string" ? params.id : "";

  const state = useAsync<VariantDetailData>(async () => {
    const [items, adjustments] = await Promise.all([
      listInventory(supabase),
      listAdjustments(supabase, { variantId, limit: 50 }),
    ]);
    return { variant: items.find((v) => v.id === variantId) ?? null, adjustments };
  }, [variantId]);

  // Authoritative qty straight from the adjust RPC, shown until the next reload.
  const [qtyOverride, setQtyOverride] = useState<number | null>(null);

  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const variant = state.data?.variant ?? null;
  const qty = qtyOverride ?? variant?.inventory?.qty_on_hand ?? 0;

  const submitAdjustment = async () => {
    const parsed = inventoryAdjustmentSchema.safeParse({
      variant_id: variantId,
      delta,
      reason,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await adjustInventory(supabase, parsed.data);
      setQtyOverride(result.new_qty);
      setDelta(0);
      setReason("");
      // Fire-and-forget QBO sync — never block the UI on QuickBooks.
      if (result.sync_log_id) {
        void syncInventoryToQbo(supabase, result.sync_log_id).catch(() => {
          // Failures land in qbo_sync_log and surface in the admin retry view.
        });
      }
      Alert.alert("Inventory updated", `New quantity on hand: ${result.new_qty}`);
      void state.reload();
    } catch (e) {
      Alert.alert("Adjustment failed", errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading && !state.data) return <LoadingView />;
  if (state.error && !state.data) {
    return <ErrorView message={state.error} onRetry={() => void state.reload()} />;
  }
  if (!variant) {
    return (
      <EmptyState
        icon="cube-outline"
        title="Variant not found"
        message="It may have been removed, or you may not have access."
      />
    );
  }

  const quickButtons = [-10, -1, 1, 10] as const;

  return (
    <Screen
      keyboard
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={() => void state.refresh()}
          tintColor={theme.accent}
        />
      }
    >
      <Stack.Screen options={{ title: variant.sku }} />

      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          {variant.photo_url ? (
            <Image source={{ uri: variant.photo_url }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback, { backgroundColor: tint(theme.accent) }]}>
              <Ionicons name="image-outline" size={28} color={theme.accent} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={[styles.styleName, { color: theme.muted }]}>
              {variant.style?.name ?? "Unknown style"}
            </Text>
            <Text style={[styles.sku, { color: theme.text }]}>{variant.sku}</Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {variant.color} · {variant.size}
            </Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              Location: {variant.inventory?.location ?? "—"}
            </Text>
          </View>
        </View>
        <View style={[styles.qtyBlock, { borderTopColor: theme.border }]}>
          <Text style={[styles.qtyLabel, { color: theme.muted }]}>ON HAND</Text>
          <Text style={[styles.qtyValue, { color: theme.text }]}>{qty}</Text>
        </View>
      </Card>

      {can.adjustInventory(role) ? (
        <>
          <SectionHeader title="Adjust inventory" />
          <Card>
            <View style={styles.adjustRow}>
              <QtyStepper value={delta} onChange={setDelta} />
              <View style={styles.quickRow}>
                {quickButtons.map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    onPress={() => setDelta(delta + n)}
                    style={[styles.quickButton, { borderColor: theme.border, backgroundColor: theme.bg }]}
                  >
                    <Text style={[styles.quickButtonText, { color: theme.text }]}>
                      {n > 0 ? `+${n}` : `${n}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {fieldErrors["delta"] ? (
              <Text style={[styles.fieldError, { color: theme.danger }]}>
                {fieldErrors["delta"]}
              </Text>
            ) : null}
            <Text style={[styles.previewText, { color: theme.muted }]}>
              {delta === 0
                ? "Choose a quantity change"
                : `${qty} → ${qty + delta} (${delta > 0 ? "+" : ""}${delta})`}
            </Text>
            <TextField
              label="Reason (required)"
              value={reason}
              onChangeText={setReason}
              error={fieldErrors["reason"]}
              placeholder="e.g. Cycle count, damaged goods, received PO-1042"
            />
            <Button
              title="Submit adjustment"
              loading={submitting}
              disabled={delta === 0}
              onPress={() => void submitAdjustment()}
            />
          </Card>
        </>
      ) : null}

      <SectionHeader
        title="Adjustment history"
        action={
          <Button
            title="Scan barcode"
            variant="ghost"
            small
            onPress={() => router.push("/scan")}
          />
        }
      />
      {(state.data?.adjustments ?? []).length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No adjustments yet"
          message="Inventory changes for this variant will appear here."
        />
      ) : (
        (state.data?.adjustments ?? []).map((adj) => (
          <Card key={adj.id} style={styles.adjustmentCard}>
            <View style={styles.adjustmentTop}>
              <Badge
                label={adj.delta > 0 ? `+${adj.delta}` : `${adj.delta}`}
                tone={adj.delta > 0 ? "success" : "danger"}
              />
              <Text style={[styles.adjustmentQty, { color: theme.muted }]}>
                → {adj.new_qty} on hand
              </Text>
            </View>
            <Text style={[styles.adjustmentReason, { color: theme.text }]}>{adj.reason}</Text>
            <Text style={[styles.adjustmentMeta, { color: theme.muted }]}>
              {adj.user?.full_name ?? "Unknown"} · {formatDateTime(adj.created_at)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginBottom: spacing(2),
  },
  headerRow: {
    flexDirection: "row",
    gap: spacing(3.5),
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: radius.control,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  styleName: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sku: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  meta: {
    fontSize: 14,
    marginTop: 2,
  },
  qtyBlock: {
    marginTop: spacing(4),
    paddingTop: spacing(3.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  qtyLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  qtyValue: {
    fontSize: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  adjustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing(1.5),
  },
  quickButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  fieldError: {
    fontSize: 13,
    marginTop: spacing(2),
  },
  previewText: {
    fontSize: 14,
    marginVertical: spacing(3),
  },
  adjustmentCard: {
    marginBottom: spacing(2),
  },
  adjustmentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  adjustmentQty: {
    fontSize: 13,
    fontWeight: "600",
  },
  adjustmentReason: {
    fontSize: 15,
    marginTop: spacing(2),
  },
  adjustmentMeta: {
    fontSize: 13,
    marginTop: spacing(1),
  },
});
