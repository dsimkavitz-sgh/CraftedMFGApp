import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, useTheme } from "@/theme/tokens";

// TODO(phase2): Barcode scanning flow.
//   1. Add expo-camera and request camera permission on mount.
//   2. Render CameraView with barcodeScannerSettings: { barcodeTypes: ["code128"] }.
//   3. On scan, decode the Code128 payload (SKU or variants.barcode value).
//   4. Look up the variant with the shared findVariantByCode(supabase, code).
//   5. On a hit, router.replace(`/variant/${variant.id}`); on a miss, show an
//      inline "No variant matches this code" state with a rescan button.
//   6. Code128 barcode generation from SKUs happens server-side in Phase 2 and
//      populates the variants.barcode column (null in MVP).
// expo-camera is intentionally NOT a dependency yet.

export default function ScanScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Badge label="Phase 2" tone="accent" />
        <Text style={[styles.title, { color: theme.text }]}>Barcode scanning is coming soon</Text>
        <Text style={[styles.body, { color: theme.muted }]}>
          In Phase 2 you'll point the camera at a Code128 barcode to jump straight to that
          variant's detail screen and adjust inventory on the spot.
        </Text>

        <View
          style={[
            styles.viewfinder,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={[styles.corner, styles.cornerTL, { borderColor: theme.accent }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: theme.accent }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: theme.accent }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: theme.accent }]} />
          <Ionicons name="barcode-outline" size={64} color={theme.muted} />
          <Text style={[styles.viewfinderText, { color: theme.muted }]}>
            Camera viewfinder (disabled)
          </Text>
        </View>

        <Text style={[styles.footnote, { color: theme.muted }]}>
          Until then, use search on the Inventory tab to find variants by SKU.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(3),
    paddingBottom: spacing(10),
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: spacing(4),
  },
  viewfinder: {
    width: 240,
    height: 240,
    borderWidth: 1,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    marginVertical: spacing(4),
  },
  viewfinderText: {
    fontSize: 13,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  footnote: {
    fontSize: 13,
    textAlign: "center",
  },
});
