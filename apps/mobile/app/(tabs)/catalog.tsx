import { listStyles, type StyleWithRelations } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/ui/AsyncStates";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { spacing, tint, useTheme } from "@/theme/tokens";

function totalOnHand(style: StyleWithRelations): number {
  return style.variants.reduce((acc, v) => acc + (v.inventory?.qty_on_hand ?? 0), 0);
}

export default function CatalogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const styles_ = useAsync(() => listStyles(supabase), []);

  if (styles_.loading && !styles_.data) return <LoadingView />;
  if (styles_.error && !styles_.data) {
    return <ErrorView message={styles_.error} onRetry={() => void styles_.reload()} />;
  }

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={styles_.data ?? []}
        keyExtractor={(s) => s.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={styles_.refreshing}
            onRefresh={() => void styles_.refresh()}
            tintColor={theme.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="pricetags-outline"
            title="No styles yet"
            message="Hat styles you create will show up here with their hero photos."
          />
        }
        renderItem={({ item: style }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/style/${style.id}`)}
            style={styles.cell}
          >
            {({ pressed }) => (
              <Card flush style={[styles.card, pressed && styles.cardPressed]}>
                {style.hero_photo_url ? (
                  <Image
                    source={{ uri: style.hero_photo_url }}
                    style={[styles.hero, { backgroundColor: tint(theme.accent) }]}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={[styles.hero, styles.heroFallback, { backgroundColor: tint(theme.accent) }]}>
                    <Ionicons name="image-outline" size={32} color={theme.accent} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
                    {style.name}
                  </Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>
                    {style.variants.length} variant{style.variants.length === 1 ? "" : "s"} ·{" "}
                    {totalOnHand(style)} on hand
                  </Text>
                </View>
              </Card>
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing(4),
    paddingBottom: spacing(6),
    flexGrow: 1,
  },
  column: {
    gap: spacing(3),
  },
  cell: {
    flex: 1,
    maxWidth: "50%",
    marginBottom: spacing(3),
  },
  card: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.85,
  },
  hero: {
    width: "100%",
    aspectRatio: 1,
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: spacing(3),
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});
