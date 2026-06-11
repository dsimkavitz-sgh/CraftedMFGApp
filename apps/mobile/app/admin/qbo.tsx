import {
  can,
  disconnectQbo,
  formatDateTime,
  getQboConnectUrl,
  getQboStatus,
  listSyncLog,
  retrySync,
  type QboConnectionStatus,
  type QboSyncLogRow,
} from "@crafted/shared";
import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/ui/AsyncStates";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { spacing, useTheme } from "@/theme/tokens";

interface QboData {
  status: QboConnectionStatus;
  problems: QboSyncLogRow[];
}

export default function QboAdminScreen() {
  const theme = useTheme();
  const { role, loading: sessionLoading } = useSession();

  const state = useAsync<QboData>(async () => {
    const [status, problems] = await Promise.all([
      getQboStatus(supabase),
      listSyncLog(supabase, { onlyProblems: true }),
    ]);
    return { status, problems };
  }, []);

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Admin only — bounce everyone else back to the tabs.
  if (!sessionLoading && !can.viewQboAdmin(role)) {
    return <Redirect href="/(tabs)" />;
  }

  const connect = async () => {
    setConnecting(true);
    try {
      const url = await getQboConnectUrl(supabase);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Could not start connect flow", errorMessage(e));
    } finally {
      setConnecting(false);
    }
  };

  const confirmDisconnect = () => {
    Alert.alert(
      "Disconnect QuickBooks?",
      "Inventory will stop syncing to QuickBooks Online until you reconnect.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDisconnecting(true);
              try {
                await disconnectQbo(supabase);
                void state.reload();
              } catch (e) {
                Alert.alert("Could not disconnect", errorMessage(e));
              } finally {
                setDisconnecting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const retry = async (row: QboSyncLogRow) => {
    setRetryingId(row.id);
    try {
      await retrySync(supabase, row.id);
      void state.reload();
    } catch (e) {
      Alert.alert("Retry failed", errorMessage(e));
    } finally {
      setRetryingId(null);
    }
  };

  if (state.loading && !state.data) return <LoadingView />;
  if (state.error && !state.data) {
    return <ErrorView message={state.error} onRetry={() => void state.reload()} />;
  }

  const status = state.data?.status ?? null;
  const problems = state.data?.problems ?? [];

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
      <Card>
        <View style={styles.statusTop}>
          <Text style={[styles.statusTitle, { color: theme.text }]}>QuickBooks Online</Text>
          <Badge
            label={status?.connected ? "Connected" : "Not connected"}
            tone={status?.connected ? "success" : "neutral"}
          />
        </View>
        {status?.connected ? (
          <>
            <Text style={[styles.statusLine, { color: theme.muted }]}>
              Realm: {status.realm_id ?? "—"}
            </Text>
            <Text style={[styles.statusLine, { color: theme.muted }]}>
              Environment: {status.environment ?? "—"}
            </Text>
            <Text style={[styles.statusLine, { color: theme.muted }]}>
              Connected {formatDateTime(status.connected_at)}
            </Text>
            <Button
              title="Disconnect"
              variant="danger"
              loading={disconnecting}
              onPress={confirmDisconnect}
              style={styles.statusButton}
            />
          </>
        ) : (
          <>
            <Text style={[styles.statusLine, { color: theme.muted }]}>
              Connect your QuickBooks company to keep inventory quantities in sync.
            </Text>
            <Button
              title="Connect QuickBooks"
              loading={connecting}
              onPress={() => void connect()}
              style={styles.statusButton}
            />
          </>
        )}
      </Card>

      <SectionHeader title={`Sync problems (${problems.length})`} />
      {problems.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="All clear"
          message="No pending or failed sync entries. Pull to refresh."
        />
      ) : (
        problems.map((row) => (
          <Card key={row.id} style={styles.problemCard}>
            <View style={styles.problemTop}>
              <Text style={[styles.problemEntity, { color: theme.text }]}>
                {row.entity} · {row.action}
              </Text>
              <Badge
                label={row.status === "error" ? "Error" : "Pending"}
                tone={row.status === "error" ? "danger" : "warn"}
              />
            </View>
            {row.error ? (
              <Text style={[styles.problemError, { color: theme.danger }]} numberOfLines={3}>
                {row.error}
              </Text>
            ) : null}
            <Text style={[styles.problemMeta, { color: theme.muted }]}>
              {formatDateTime(row.created_at)}
            </Text>
            <Button
              title="Retry"
              variant="secondary"
              small
              loading={retryingId === row.id}
              onPress={() => void retry(row)}
              style={styles.retryButton}
            />
          </Card>
        ))
      )}
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(2),
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  statusLine: {
    fontSize: 14,
    marginTop: spacing(1),
  },
  statusButton: {
    marginTop: spacing(4),
  },
  problemCard: {
    marginBottom: spacing(2),
  },
  problemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  problemEntity: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  problemError: {
    fontSize: 13,
    marginTop: spacing(2),
  },
  problemMeta: {
    fontSize: 12,
    marginTop: spacing(1),
  },
  retryButton: {
    marginTop: spacing(3),
    alignSelf: "flex-start",
  },
  bottomSpace: {
    height: spacing(8),
  },
});
