import {
  STAGE_LABELS,
  currentStage,
  formatDate,
  isManufacturingStage,
  listPurchaseOrders,
  sumQty,
  type PurchaseOrderWithRelations,
} from "@crafted/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorView, LoadingView } from "@/components/ui/AsyncStates";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { radius, spacing, useTheme } from "@/theme/tokens";

function stageLabel(po: PurchaseOrderWithRelations): string | null {
  const stage = currentStage(po);
  if (!stage) return null;
  return isManufacturingStage(stage) ? STAGE_LABELS[stage] : stage;
}

export default function OrdersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const orders = useAsync(
    () => listPurchaseOrders(supabase, { includeClosed: showAll }),
    [showAll],
  );

  const Toggle = (
    <View style={[styles.toggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {(
        [
          { key: false, label: "Open" },
          { key: true, label: "All" },
        ] as const
      ).map((opt) => {
        const active = showAll === opt.key;
        return (
          <Pressable
            key={opt.label}
            accessibilityRole="button"
            onPress={() => setShowAll(opt.key)}
            style={[styles.toggleOption, active && { backgroundColor: theme.accent }]}
          >
            <Text
              style={[styles.toggleText, { color: active ? "#ffffff" : theme.muted }]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (orders.loading && !orders.data) return <LoadingView />;
  if (orders.error && !orders.data) {
    return <ErrorView message={orders.error} onRetry={() => void orders.reload()} />;
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.toggleRow}>{Toggle}</View>
      <FlatList
        data={orders.data ?? []}
        keyExtractor={(po) => po.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={orders.refreshing}
            onRefresh={() => void orders.refresh()}
            tintColor={theme.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title={showAll ? "No purchase orders" : "Nothing on order"}
            message={
              showAll
                ? "Purchase orders will appear here once created."
                : "Open POs show up here. Toggle to All to see received and cancelled orders."
            }
          />
        }
        renderItem={({ item: po }) => {
          const photos = po.line_items
            .map((li) => li.variant?.photo_url)
            .filter((url): url is string => typeof url === "string" && url.length > 0);
          const stage = stageLabel(po);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/order/${po.id}`)}
            >
              {({ pressed }) => (
                <Card style={[styles.card, pressed && styles.cardPressed]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={[styles.poNumber, { color: theme.text }]}>{po.po_number}</Text>
                      <Text numberOfLines={1} style={[styles.supplier, { color: theme.muted }]}>
                        {po.supplier?.name ?? "Unknown supplier"}
                      </Text>
                    </View>
                    <StatusBadge kind="po" status={po.status} />
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: theme.muted }]}>
                      ETA {formatDate(po.eta)}
                    </Text>
                    <Text style={[styles.metaText, { color: theme.muted }]}>
                      {sumQty(po.line_items)} units
                    </Text>
                    {stage ? <Badge label={stage} tone="accent" /> : null}
                  </View>

                  {photos.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.photoStrip}
                    >
                      {photos.map((url, i) => (
                        <Image
                          key={`${url}-${i}`}
                          source={{ uri: url }}
                          style={[styles.stripPhoto, { backgroundColor: theme.border }]}
                          contentFit="cover"
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                </Card>
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    paddingBottom: spacing(1),
    flexDirection: "row",
  },
  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.pill,
    padding: 3,
  },
  toggleOption: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: spacing(4),
    paddingBottom: spacing(6),
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing(3),
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  cardTitleWrap: {
    flex: 1,
  },
  poNumber: {
    fontSize: 17,
    fontWeight: "800",
  },
  supplier: {
    fontSize: 14,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    marginTop: spacing(2.5),
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  photoStrip: {
    marginTop: spacing(3),
  },
  stripPhoto: {
    width: 56,
    height: 56,
    borderRadius: radius.control,
    marginRight: spacing(2),
  },
});
