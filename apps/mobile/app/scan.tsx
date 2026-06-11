import { findVariantByCode } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { errorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { radius, spacing, useTheme } from "@/theme/tokens";

// Code128 is what we print from the web app (encodes the SKU); the rest are
// common label formats so off-the-shelf supplier barcodes also resolve once
// they're stored in variants.barcode.
const BARCODE_TYPES = ["code128", "code39", "ean13", "upc_a", "qr"] as const;

type ScanStatus =
  | { kind: "scanning" }
  | { kind: "looking_up"; code: string }
  | { kind: "miss"; code: string };

export default function ScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>({ kind: "scanning" });
  // Guards against the camera firing multiple results for one barcode.
  const handlingRef = useRef(false);

  const onScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (handlingRef.current || !data) return;
      handlingRef.current = true;
      const code = data.trim();
      setStatus({ kind: "looking_up", code });
      try {
        const variant = await findVariantByCode(supabase, code);
        if (variant) {
          router.replace(`/variant/${variant.id}`);
          return;
        }
        setStatus({ kind: "miss", code });
      } catch (e) {
        setStatus({ kind: "miss", code: errorMessage(e) });
      }
    },
    [router],
  );

  const rescan = () => {
    handlingRef.current = false;
    setStatus({ kind: "scanning" });
  };

  if (!permission) return <Screen>{null}</Screen>;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={theme.muted} />
          <Text style={[styles.title, { color: theme.text }]}>Camera access needed</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Point the camera at a SKU barcode to jump straight to that variant and adjust
            inventory on the spot.
          </Text>
          <Button
            title={permission.canAskAgain ? "Allow camera" : "Open Settings to allow camera"}
            onPress={() => void requestPermission()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.flex, styles.cameraBg]}>
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={status.kind === "scanning" ? (r) => void onScanned(r) : undefined}
      />
      {/* Viewfinder overlay */}
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
          {status.kind === "scanning" ? (
            <Text style={[styles.statusText, { color: theme.text }]}>
              Center the barcode in the frame
            </Text>
          ) : status.kind === "looking_up" ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.statusText, { color: theme.text }]} numberOfLines={1}>
                Looking up {status.code}…
              </Text>
            </View>
          ) : (
            <View style={styles.missBlock}>
              <Text style={[styles.statusText, { color: theme.danger }]} numberOfLines={2}>
                No variant matches “{status.code}”
              </Text>
              <Button title="Scan again" small onPress={rescan} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cameraBg: { backgroundColor: "#000000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(4),
    paddingHorizontal: spacing(6),
  },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(6),
  },
  frame: { width: 260, height: 180 },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#ffffff",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  statusCard: {
    minWidth: 260,
    maxWidth: 320,
    borderRadius: radius.card,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  missBlock: { alignItems: "center", gap: spacing(2) },
  statusText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
