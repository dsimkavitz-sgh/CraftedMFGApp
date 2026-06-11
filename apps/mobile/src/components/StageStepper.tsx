import {
  MANUFACTURING_STAGES,
  STAGE_LABELS,
  formatDateTime,
  stageIndex,
  type StageEventWithUser,
} from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { spacing, tint, useTheme } from "@/theme/tokens";

interface StageStepperProps {
  /** The PO's current stage (latest event), or null if nothing recorded yet. */
  current: string | null;
  /** Stage history, newest first (listStageHistory). */
  history?: StageEventWithUser[];
}

/** Vertical timeline of the manufacturing pipeline with done/current/upcoming states. */
export function StageStepper({ current, history = [] }: StageStepperProps) {
  const theme = useTheme();
  const currentIndex = current ? stageIndex(current) : -1;

  return (
    <View>
      {MANUFACTURING_STAGES.map((stage, i) => {
        const state: "done" | "current" | "upcoming" =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        const isLast = i === MANUFACTURING_STAGES.length - 1;
        // History is newest-first, so find() returns the latest event per stage.
        const event = history.find((e) => e.stage === stage);

        const dotColor =
          state === "done" ? theme.success : state === "current" ? theme.accent : theme.border;

        return (
          <View key={stage} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: state === "upcoming" ? theme.card : dotColor,
                    borderColor: dotColor,
                  },
                  state === "current" && { backgroundColor: tint(theme.accent, "33") },
                ]}
              >
                {state === "done" ? (
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                ) : state === "current" ? (
                  <View style={[styles.innerDot, { backgroundColor: theme.accent }]} />
                ) : null}
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: i < currentIndex ? theme.success : theme.border },
                  ]}
                />
              ) : null}
            </View>
            <View style={[styles.content, !isLast && styles.contentSpacing]}>
              <Text
                style={[
                  styles.label,
                  {
                    color: state === "upcoming" ? theme.muted : theme.text,
                    fontWeight: state === "current" ? "700" : "600",
                  },
                ]}
              >
                {STAGE_LABELS[stage]}
              </Text>
              {event ? (
                <>
                  <Text style={[styles.meta, { color: theme.muted }]}>
                    {event.user?.full_name ?? "Unknown"} · {formatDateTime(event.created_at)}
                  </Text>
                  {event.note ? (
                    <Text style={[styles.note, { color: theme.muted }]}>{event.note}</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rail: {
    alignItems: "center",
    width: 24,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: spacing(0.5),
  },
  content: {
    flex: 1,
    marginLeft: spacing(3),
    paddingTop: 1,
  },
  contentSpacing: {
    paddingBottom: spacing(4),
  },
  label: {
    fontSize: 15,
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    fontSize: 13,
    marginTop: 2,
    fontStyle: "italic",
  },
});
