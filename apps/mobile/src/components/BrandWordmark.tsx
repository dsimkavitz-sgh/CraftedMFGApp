import { StyleSheet, Text, View } from "react-native";
import { spacing, useTheme } from "@/theme/tokens";

/**
 * The Crafted MFG logo: "Crafted" in Comfortaa (rounded geometric, matching
 * the brand wordmark) with the stacked M/F/G at the right, and optionally the
 * "HEADWEAR, APPAREL & LIVE EVENTS" tagline underneath.
 * Comfortaa_700Bold is loaded in app/_layout.tsx before first render.
 */
export function BrandWordmark({ size = 40, tagline = false }: { size?: number; tagline?: boolean }) {
  const theme = useTheme();
  const mfgSize = size * 0.22;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text
          style={[styles.crafted, { color: theme.text, fontSize: size, lineHeight: size * 1.12 }]}
        >
          Crafted
        </Text>
        <View style={[styles.mfg, { height: size * 0.92 }]}>
          {(["M", "F", "G"] as const).map((l) => (
            <Text
              key={l}
              style={[styles.mfgLetter, { color: theme.text, fontSize: mfgSize }]}
            >
              {l}
            </Text>
          ))}
        </View>
      </View>
      {tagline ? (
        <Text style={[styles.tagline, { color: theme.muted, fontSize: size * 0.19 }]}>
          HEADWEAR, APPAREL & LIVE EVENTS
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  row: { flexDirection: "row", alignItems: "flex-start" },
  crafted: {
    fontFamily: "Comfortaa_700Bold",
    letterSpacing: -1,
  },
  mfg: {
    justifyContent: "space-between",
    marginLeft: spacing(1.5),
    paddingTop: spacing(1),
  },
  mfgLetter: {
    fontWeight: "900",
    lineHeight: undefined,
  },
  tagline: {
    fontWeight: "800",
    letterSpacing: 2.5,
    marginTop: spacing(2),
  },
});
