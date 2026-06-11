import {
  can,
  createVariant,
  getStyle,
  updateStyle,
  variantSchema,
} from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
import { TextField } from "@/components/ui/TextField";
import { PhotoPicker } from "@/components/PhotoPicker";
import { VariantRow } from "@/components/VariantRow";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { spacing, tint, useTheme } from "@/theme/tokens";

function AddVariantModal({
  styleId,
  styleName,
  visible,
  onClose,
  onCreated,
}: {
  styleId: string;
  styleName: string;
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const theme = useTheme();
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsed = variantSchema.safeParse({
      style_id: styleId,
      color,
      size,
      photo_url: photoUrl,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const variant = await createVariant(supabase, styleName, parsed.data);
      Alert.alert("Variant created", `Generated SKU: ${variant.sku}`);
      setColor("");
      setSize("");
      setPhotoUrl(null);
      onCreated();
    } catch (e) {
      Alert.alert("Could not create variant", errorMessage(e));
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
        <Text style={[styles.modalTitle, { color: theme.text }]}>Add variant</Text>
        <Text style={[styles.modalSubtitle, { color: theme.muted }]}>
          {styleName} — the SKU is generated automatically.
        </Text>
        <TextField
          label="Color"
          value={color}
          onChangeText={setColor}
          error={fieldErrors["color"]}
          placeholder="Navy"
        />
        <TextField
          label="Size"
          value={size}
          onChangeText={setSize}
          error={fieldErrors["size"]}
          placeholder="One size / S-M / L-XL"
        />
        <PhotoPicker
          folder="variants"
          label="Photo (optional)"
          value={photoUrl}
          onUploaded={setPhotoUrl}
        />
        <Button title="Create variant" loading={saving} onPress={() => void submit()} />
        <Button title="Cancel" variant="ghost" onPress={onClose} style={styles.cancelButton} />
      </ScrollView>
    </Modal>
  );
}

export default function StyleDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const styleId = typeof params.id === "string" ? params.id : "";

  const state = useAsync(() => getStyle(supabase, styleId), [styleId]);
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  if (state.loading && !state.data) return <LoadingView />;
  if (state.error || !state.data) {
    return (
      <ErrorView
        message={state.error ?? "Style not found"}
        onRetry={() => void state.reload()}
      />
    );
  }

  const style = state.data;
  const canEdit = can.editCatalog(role);

  const toggleActive = async (active: boolean) => {
    setTogglingActive(true);
    try {
      await updateStyle(supabase, style.id, { active });
      void state.reload();
    } catch (e) {
      Alert.alert("Could not update style", errorMessage(e));
    } finally {
      setTogglingActive(false);
    }
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
      <Stack.Screen options={{ title: style.name }} />

      <Card flush>
        {style.hero_photo_url ? (
          <Image
            source={{ uri: style.hero_photo_url }}
            style={[styles.hero, { backgroundColor: tint(theme.accent) }]}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.hero, styles.heroFallback, { backgroundColor: tint(theme.accent) }]}>
            <Ionicons name="image-outline" size={40} color={theme.accent} />
          </View>
        )}
        <View style={styles.heroBody}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: theme.text }]}>{style.name}</Text>
            <Badge
              label={style.active ? "Active" : "Inactive"}
              tone={style.active ? "success" : "neutral"}
            />
          </View>
          {style.description ? (
            <Text style={[styles.description, { color: theme.muted }]}>{style.description}</Text>
          ) : null}
          <Text style={[styles.supplier, { color: theme.muted }]}>
            Supplier: {style.supplier?.name ?? "—"}
          </Text>
          {canEdit ? (
            <View style={[styles.activeRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.activeLabel, { color: theme.text }]}>Active in catalog</Text>
              <Switch
                value={style.active}
                disabled={togglingActive}
                onValueChange={(v) => void toggleActive(v)}
                trackColor={{ true: theme.accent }}
              />
            </View>
          ) : null}
        </View>
      </Card>

      <SectionHeader
        title={`Variants (${style.variants.length})`}
        action={
          canEdit ? (
            <Button
              title="+ Add variant"
              variant="ghost"
              small
              onPress={() => setAddVariantOpen(true)}
            />
          ) : undefined
        }
      />
      {style.variants.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No variants yet"
          message="Add color/size variants to start tracking inventory for this style."
        />
      ) : (
        style.variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            onPress={() => router.push(`/variant/${variant.id}`)}
          />
        ))
      )}
      <View style={styles.bottomSpace} />

      <AddVariantModal
        styleId={style.id}
        styleName={style.name}
        visible={addVariantOpen}
        onClose={() => setAddVariantOpen(false)}
        onCreated={() => {
          setAddVariantOpen(false);
          void state.reload();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    aspectRatio: 16 / 10,
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroBody: {
    padding: spacing(4),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing(2),
  },
  supplier: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing(2),
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(3.5),
    paddingTop: spacing(3.5),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  activeLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  bottomSpace: {
    height: spacing(8),
  },
  modalContent: {
    padding: spacing(4),
    paddingTop: spacing(6),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: spacing(1),
    marginBottom: spacing(4),
  },
  cancelButton: {
    marginTop: spacing(2),
  },
});
