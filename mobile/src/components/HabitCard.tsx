import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api/client";
import { COLORS } from "../theme/colors";

type Props = {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  scheduledToday?: boolean; // Er vanen planlagt til i dag? Hvis ikke, vises "Ikke i dag" (backenden afviser med 400)
  onComplete: (id: string) => Promise<void>;
  onUndo?: (id: string) => Promise<void>; // Vises som "Fortryd", når vanen er gennemført i dag
};

export default function HabitCard({
  id,
  name,
  streak,
  completedToday,
  scheduledToday = true,
  onComplete,
  onUndo,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingUndo, setConfirmingUndo] = useState(false);

  // Kører gennemfør eller fortryd. Viser indlæsning undervejs og en dansk fejlbesked, hvis det fejler.
  async function run(action: (id: string) => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action(id);
    } catch (err) {
      // Kun fejl fra API-kaldet vises, så tekniske JS-fejl ikke når brugeren
      setError(err instanceof ApiError ? err.message : "Noget gik galt. Prøv igen.");
    } finally {
      setLoading(false);
    }
  }

  const notScheduled = !completedToday && !scheduledToday;
  const disabled = completedToday || notScheduled || loading;

  return (
    <View style={[styles.card, completedToday && styles.cardDone]}>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.streak}>🔥 {streak} dages streak</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => run(onComplete)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          style={[
            styles.button,
            completedToday && styles.buttonDone,
            notScheduled && styles.buttonOff,
            loading && styles.buttonLoading,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={completedToday ? COLORS.greenDark : COLORS.white} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                completedToday && styles.buttonTextDone,
                notScheduled && styles.buttonTextOff,
              ]}
            >
              {completedToday ? "✓ Gjort i dag" : notScheduled ? "Ikke i dag" : "Gennemfør"}
            </Text>
          )}
        </Pressable>

        {completedToday && onUndo && (
          <Pressable
            onPress={() => setConfirmingUndo(true)}
            disabled={loading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fortryd gennemførsel"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={[styles.undoText, loading && styles.buttonLoading]}>Fortryd</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={confirmingUndo}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingUndo(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Er du sikker?</Text>
            <Text style={styles.dialogText}>
              Vil du fortryde, at du har gennemført "{name}" i dag? Du mister de point, den gav.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setConfirmingUndo(false)}
                accessibilityRole="button"
                style={[styles.dialogButton, styles.dialogCancel]}
              >
                <Text style={styles.dialogCancelText}>Annuller</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirmingUndo(false);
                  if (onUndo) run(onUndo);
                }}
                accessibilityRole="button"
                style={[styles.dialogButton, styles.dialogConfirm]}
              >
                <Text style={styles.dialogConfirmText}>Ja, fortryd</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  dialogText: {
    color: COLORS.muted,
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  dialogButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dialogCancel: {
    backgroundColor: COLORS.border,
  },
  dialogCancelText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  dialogConfirm: {
    backgroundColor: COLORS.error,
  },
  dialogConfirmText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardDone: {
    backgroundColor: "#E8F5F0",
    borderColor: COLORS.green,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  streak: {
    color: COLORS.muted,
  },
  error: {
    color: COLORS.error,
  },
  actions: {
    alignItems: "center",
    gap: 8,
  },
  undoText: {
    color: COLORS.greenDark,
    textDecorationLine: "underline",
  },
  button: {
    minWidth: 120,
    alignItems: "center",
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonDone: {
    backgroundColor: "#CFE9DF",
  },
  buttonOff: {
    backgroundColor: COLORS.border,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  buttonTextDone: {
    color: COLORS.greenDark,
  },
  buttonTextOff: {
    color: COLORS.muted,
  },
});
