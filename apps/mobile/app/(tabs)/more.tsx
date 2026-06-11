import { ROLE_LABELS, can } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { registerForPush } from "@/lib/push";
import { spacing, tint, useTheme, type Palette } from "@/theme/tokens";

function Row({
  theme,
  icon,
  title,
  subtitle,
  onPress,
  loading = false,
}: {
  theme: Palette;
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, opacity: pressed || loading ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint(theme.accent) }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.muted} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, role, signOut } = useSession();
  const [pushBusy, setPushBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const token = await registerForPush();
      if (token) {
        Alert.alert(
          "Push notifications enabled",
          "This device will receive shipment notifications once they launch in Phase 2.",
        );
      } else {
        Alert.alert(
          "Not available",
          "Push notifications need a physical device and notification permission.",
        );
      }
    } catch (e) {
      Alert.alert("Could not enable notifications", errorMessage(e));
    } finally {
      setPushBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign in again to use the app.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSigningOut(true);
            try {
              await signOut();
            } catch (e) {
              Alert.alert("Could not sign out", errorMessage(e));
            } finally {
              setSigningOut(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: tint(theme.accent) }]}>
          <Text style={[styles.avatarText, { color: theme.accent }]}>
            {(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {profile?.full_name ?? "Unknown user"}
          </Text>
          <Text style={[styles.profileEmail, { color: theme.muted }]}>
            {profile?.email ?? "—"}
          </Text>
        </View>
        {role ? <Badge label={ROLE_LABELS[role]} tone="accent" /> : null}
      </Card>

      <SectionHeader title="Settings" />
      <Card flush>
        <Row
          theme={theme}
          icon="notifications-outline"
          title="Enable push notifications"
          subtitle="Shipment alerts arrive in Phase 2"
          loading={pushBusy}
          onPress={() => void enablePush()}
        />
        <Row
          theme={theme}
          icon="barcode-outline"
          title="Scan barcode"
          subtitle="Point the camera at a SKU label to look up a variant"
          onPress={() => router.push("/scan")}
        />
      </Card>

      {can.viewQboAdmin(role) ? (
        <>
          <SectionHeader title="Admin" />
          <Card flush>
            <Row
              theme={theme}
              icon="sync-outline"
              title="Admin settings"
              subtitle="QuickBooks connection and sync log"
              onPress={() => router.push("/admin/qbo")}
            />
            <Row
              theme={theme}
              icon="people-outline"
              title="Users"
              subtitle="Manage roles in the web admin"
              onPress={() =>
                Alert.alert(
                  "Manage users on the web",
                  "User roles are managed from the Crafted MFG web admin. Open it in your browser to invite users or change roles.",
                )
              }
            />
          </Card>
        </>
      ) : null}

      <Button
        title="Sign out"
        variant="danger"
        loading={signingOut}
        onPress={confirmSignOut}
        style={styles.signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  signOut: {
    marginTop: spacing(8),
    marginBottom: spacing(6),
  },
});
