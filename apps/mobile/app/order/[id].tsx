import {
  CARRIERS,
  CARRIER_LABELS,
  MANUFACTURING_STAGES,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  STAGE_LABELS,
  can,
  carrierTrackingUrl,
  createShipment,
  currentStage,
  deleteShipment,
  formatCurrency,
  formatDate,
  getPurchaseOrder,
  isManufacturingStage,
  listStageHistory,
  nextStage,
  recordStageEvent,
  shipmentSchema,
  stageEventSchema,
  sumQty,
  updateShipment,
  type Carrier,
  type ManufacturingStage,
  type PurchaseOrderWithRelations,
  type ShipmentRow,
  type StageEventWithUser,
} from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorView, LoadingView } from "@/components/ui/AsyncStates";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SelectSheet } from "@/components/ui/SelectSheet";
import { StageStepper } from "@/components/StageStepper";
import { StatusBadge } from "@/components/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { radius, spacing, tint, useTheme } from "@/theme/tokens";

interface PoDetailData {
  po: PurchaseOrderWithRelations;
  history: StageEventWithUser[];
}

// ── Stage note prompt (cross-platform replacement for Alert.prompt) ─────────

function StageNoteModal({
  stage,
  visible,
  saving,
  onCancel,
  onConfirm,
}: {
  stage: ManufacturingStage | null;
  visible: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const theme = useTheme();
  const [note, setNote] = useState("");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.promptBackdrop}>
        <View style={[styles.promptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.promptTitle, { color: theme.text }]}>
            Set stage to {stage ? STAGE_LABELS[stage] : ""}
          </Text>
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Samples approved by Daylan"
            multiline
          />
          <View style={styles.promptActions}>
            <Button title="Cancel" variant="secondary" small onPress={onCancel} />
            <Button
              title="Record stage"
              small
              loading={saving}
              onPress={() => {
                onConfirm(note);
                setNote("");
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Shipment add/edit modal ──────────────────────────────────────────────────

function ShipmentFormModal({
  poId,
  shipment,
  visible,
  onClose,
  onSaved,
}: {
  poId: string;
  shipment: ShipmentRow | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [carrier, setCarrier] = useState<Carrier>(shipment?.carrier ?? "ups");
  const [trackingNumber, setTrackingNumber] = useState(shipment?.tracking_number ?? "");
  const [status, setStatus] = useState<string>(shipment?.status ?? "pending");
  const [eta, setEta] = useState(shipment?.eta ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsed = shipmentSchema.safeParse({
      po_id: poId,
      carrier,
      tracking_number: trackingNumber,
      status,
      eta: eta.trim() ? eta.trim() : null,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      if (shipment) {
        const { po_id: _poId, ...rest } = parsed.data;
        await updateShipment(supabase, shipment.id, rest);
      } else {
        await createShipment(supabase, parsed.data);
      }
      onSaved();
    } catch (e) {
      Alert.alert("Could not save shipment", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={styles.modalContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          {shipment ? "Edit shipment" : "Add shipment"}
        </Text>

        <Text style={[styles.inlineLabel, { color: theme.muted }]}>CARRIER</Text>
        <View style={styles.carrierRow}>
          {CARRIERS.map((c) => {
            const active = carrier === c;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                onPress={() => setCarrier(c)}
                style={[
                  styles.carrierPill,
                  {
                    backgroundColor: active ? tint(theme.accent) : theme.card,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[styles.carrierText, { color: active ? theme.accent : theme.muted }]}
                >
                  {CARRIER_LABELS[c]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Tracking number"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          error={fieldErrors["tracking_number"]}
          placeholder="1Z999AA10123456784"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <SelectSheet
          label="Status"
          placeholder="Pick a status"
          value={status}
          options={SHIPMENT_STATUSES.map((s) => ({
            value: s,
            label: SHIPMENT_STATUS_LABELS[s],
          }))}
          onChange={(v) => setStatus(v ?? "pending")}
          error={fieldErrors["status"]}
          style={styles.field}
        />
        <TextField
          label="ETA (optional)"
          value={eta}
          onChangeText={setEta}
          error={fieldErrors["eta"]}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />

        <Button
          title={shipment ? "Save changes" : "Add shipment"}
          loading={saving}
          onPress={() => void submit()}
        />
        <Button title="Cancel" variant="ghost" onPress={onClose} style={styles.cancelButton} />
      </ScrollView>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailScreen() {
  const theme = useTheme();
  const { role } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const poId = typeof params.id === "string" ? params.id : "";

  const state = useAsync<PoDetailData>(async () => {
    const [po, history] = await Promise.all([
      getPurchaseOrder(supabase, poId),
      listStageHistory(supabase, poId),
    ]);
    return { po, history };
  }, [poId]);

  const [stagePrompt, setStagePrompt] = useState<ManufacturingStage | null>(null);
  const [stageSaving, setStageSaving] = useState(false);
  const [shipmentModal, setShipmentModal] = useState<
    { mode: "closed" } | { mode: "new" } | { mode: "edit"; shipment: ShipmentRow }
  >({ mode: "closed" });

  if (state.loading && !state.data) return <LoadingView />;
  if (state.error || !state.data) {
    return (
      <ErrorView
        message={state.error ?? "Purchase order not found"}
        onRetry={() => void state.reload()}
      />
    );
  }

  const { po, history } = state.data;
  const stage = currentStage(po);
  const advanceTo: ManufacturingStage | null =
    stage === null
      ? (MANUFACTURING_STAGES[0] ?? null)
      : isManufacturingStage(stage)
        ? nextStage(stage)
        : null;
  const canManage = can.advanceStages(role);
  const canShip = can.editShipments(role);

  const recordStage = async (target: ManufacturingStage, note: string) => {
    const parsed = stageEventSchema.safeParse({
      po_id: poId,
      stage: target,
      note: note.trim() ? note.trim() : null,
    });
    if (!parsed.success) {
      Alert.alert("Invalid stage", parsed.error.issues[0]?.message ?? "Check your input");
      return;
    }
    setStageSaving(true);
    try {
      await recordStageEvent(supabase, parsed.data);
      setStagePrompt(null);
      void state.reload();
    } catch (e) {
      Alert.alert("Could not record stage", errorMessage(e));
    } finally {
      setStageSaving(false);
    }
  };

  const confirmDeleteShipment = (shipment: ShipmentRow) => {
    Alert.alert(
      "Delete shipment?",
      `${CARRIER_LABELS[shipment.carrier]} ${shipment.tracking_number} will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteShipment(supabase, shipment.id);
                void state.reload();
              } catch (e) {
                Alert.alert("Could not delete shipment", errorMessage(e));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={() => void state.refresh()}
          tintColor={theme.accent}
        />
      }
    >
      <Stack.Screen options={{ title: po.po_number }} />

      <Card>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.poNumber, { color: theme.text }]}>{po.po_number}</Text>
            <Text style={[styles.supplier, { color: theme.muted }]}>
              {po.supplier?.name ?? "Unknown supplier"}
            </Text>
          </View>
          <StatusBadge kind="po" status={po.status} />
        </View>
        <View style={[styles.headerMeta, { borderTopColor: theme.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.muted }]}>ORDERED</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {formatDate(po.order_date)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.muted }]}>ETA</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>{formatDate(po.eta)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: theme.muted }]}>UNITS</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>{sumQty(po.line_items)}</Text>
          </View>
        </View>
        {po.notes ? (
          <Text style={[styles.notes, { color: theme.muted }]}>{po.notes}</Text>
        ) : null}
      </Card>

      <SectionHeader title="Line items" />
      {po.line_items.map((li) => (
        <Card key={li.id} style={styles.lineCard}>
          <View style={styles.lineRow}>
            {li.variant?.photo_url ? (
              <Image
                source={{ uri: li.variant.photo_url }}
                style={styles.lineThumb}
                contentFit="cover"
              />
            ) : (
              <View
                style={[styles.lineThumb, styles.thumbFallback, { backgroundColor: tint(theme.accent) }]}
              >
                <Ionicons name="image-outline" size={18} color={theme.accent} />
              </View>
            )}
            <View style={styles.lineInfo}>
              <Text style={[styles.lineSku, { color: theme.text }]}>
                {li.variant?.sku ?? "Unknown variant"}
              </Text>
              <Text style={[styles.lineMeta, { color: theme.muted }]}>
                {li.variant
                  ? `${li.variant.style?.name ?? ""} · ${li.variant.color} / ${li.variant.size}`
                  : "—"}
              </Text>
              <Text style={[styles.lineMeta, { color: theme.muted }]}>
                Unit cost {formatCurrency(li.unit_cost)}
              </Text>
            </View>
            <Badge label={`× ${li.qty}`} tone="accent" />
          </View>
        </Card>
      ))}

      <SectionHeader title="Manufacturing stages" />
      <Card>
        <StageStepper current={stage} history={history} />
        {canManage ? (
          <View style={[styles.stageActions, { borderTopColor: theme.border }]}>
            {advanceTo ? (
              <Button
                title={`Advance to ${STAGE_LABELS[advanceTo]}`}
                onPress={() => setStagePrompt(advanceTo)}
              />
            ) : null}
            <SelectSheet
              chip
              title="Set stage"
              placeholder="Set any stage…"
              value={null}
              options={MANUFACTURING_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              onChange={(value) => {
                if (value && isManufacturingStage(value)) setStagePrompt(value);
              }}
              style={styles.setStageChip}
            />
          </View>
        ) : null}
      </Card>

      <SectionHeader
        title="Shipments"
        action={
          canShip ? (
            <Button
              title="+ Add"
              variant="ghost"
              small
              onPress={() => setShipmentModal({ mode: "new" })}
            />
          ) : undefined
        }
      />
      {po.shipments.length === 0 ? (
        <EmptyState
          icon="airplane-outline"
          title="No shipments yet"
          message="Add a tracking number once the factory ships this order."
        />
      ) : (
        po.shipments.map((shipment) => (
          <Card key={shipment.id} style={styles.shipmentCard}>
            <View style={styles.shipmentTop}>
              <Badge label={CARRIER_LABELS[shipment.carrier]} tone="info" />
              <StatusBadge kind="shipment" status={shipment.status} />
            </View>
            <Text style={[styles.trackingNumber, { color: theme.text }]}>
              {shipment.tracking_number}
            </Text>
            <Text style={[styles.lineMeta, { color: theme.muted }]}>
              ETA {formatDate(shipment.eta)}
            </Text>
            {shipment.last_event_summary ? (
              <Text style={[styles.lastEvent, { color: theme.muted }]}>
                Last event: {shipment.last_event_summary}
              </Text>
            ) : null}
            {/* TODO(phase2): live tracking events (shipment_events via
                listShipmentEvents) render here once the track-shipments edge
                function starts polling UPS/FedEx/DHL. */}
            <Text style={[styles.phase2Note, { color: theme.muted }]}>
              Live tracking events arrive in Phase 2.
            </Text>
            <View style={styles.shipmentActions}>
              <Button
                title="Track ↗"
                variant="secondary"
                small
                onPress={() =>
                  void Linking.openURL(
                    carrierTrackingUrl(shipment.carrier, shipment.tracking_number),
                  )
                }
              />
              {canShip ? (
                <>
                  <Button
                    title="Edit"
                    variant="ghost"
                    small
                    onPress={() => setShipmentModal({ mode: "edit", shipment })}
                  />
                  <Button
                    title="Delete"
                    variant="ghost"
                    small
                    onPress={() => confirmDeleteShipment(shipment)}
                  />
                </>
              ) : null}
            </View>
          </Card>
        ))
      )}
      <View style={styles.bottomSpace} />

      <StageNoteModal
        stage={stagePrompt}
        visible={stagePrompt !== null}
        saving={stageSaving}
        onCancel={() => setStagePrompt(null)}
        onConfirm={(note) => {
          if (stagePrompt) void recordStage(stagePrompt, note);
        }}
      />

      {shipmentModal.mode !== "closed" ? (
        <ShipmentFormModal
          // Remount per shipment so the form state re-seeds.
          key={shipmentModal.mode === "edit" ? shipmentModal.shipment.id : "new"}
          poId={poId}
          shipment={shipmentModal.mode === "edit" ? shipmentModal.shipment : null}
          visible
          onClose={() => setShipmentModal({ mode: "closed" })}
          onSaved={() => {
            setShipmentModal({ mode: "closed" });
            void state.reload();
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  headerTitleWrap: {
    flex: 1,
  },
  poNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  supplier: {
    fontSize: 15,
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: "row",
    marginTop: spacing(4),
    paddingTop: spacing(3.5),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  notes: {
    fontSize: 14,
    marginTop: spacing(3),
    lineHeight: 20,
  },
  lineCard: {
    marginBottom: spacing(2),
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
  },
  lineThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  lineInfo: {
    flex: 1,
  },
  lineSku: {
    fontSize: 15,
    fontWeight: "700",
  },
  lineMeta: {
    fontSize: 13,
    marginTop: 1,
  },
  stageActions: {
    marginTop: spacing(4),
    paddingTop: spacing(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing(3),
  },
  setStageChip: {
    alignSelf: "center",
  },
  shipmentCard: {
    marginBottom: spacing(2),
  },
  shipmentTop: {
    flexDirection: "row",
    gap: spacing(2),
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing(2),
  },
  lastEvent: {
    fontSize: 13,
    marginTop: spacing(1),
  },
  phase2Note: {
    fontSize: 12,
    marginTop: spacing(1.5),
    fontStyle: "italic",
  },
  shipmentActions: {
    flexDirection: "row",
    gap: spacing(2),
    marginTop: spacing(3),
  },
  bottomSpace: {
    height: spacing(8),
  },
  promptBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(6),
  },
  promptCard: {
    alignSelf: "stretch",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing(4),
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: spacing(3),
  },
  promptActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing(2),
  },
  modalContent: {
    padding: spacing(4),
    paddingTop: spacing(6),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing(4),
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    letterSpacing: 0.5,
  },
  carrierRow: {
    flexDirection: "row",
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  carrierPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  carrierText: {
    fontSize: 15,
    fontWeight: "700",
  },
  field: {
    marginBottom: spacing(3),
  },
  cancelButton: {
    marginTop: spacing(2),
  },
});
