import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
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

  // Spørger, om brugeren er sikker, før gennemførslen fortrydes
  function confirmUndo() {
    if (!onUndo) return;
    Alert.alert(
      "Er du sikker?",
      `Vil du fortryde, at du har gennemført "${name}" i dag? Du mister de point, den gav.`,
      [
        { text: "Annuller", style: "cancel" },
        { text: "Ja, fortryd", style: "destructive", onPress: () => run(onUndo) },
      ],
    );
  }

  const notScheduled = !completedToday && !scheduledToday;
  const disabled = completedToday || notScheduled || loading;

  return (
    <View style={[styles.card, completedToday && styles.cardDone]}>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.streak}>🔥 {streak} {streak === 1 ? "dags" : "dages"} streak</Text>
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
            onPress={confirmUndo}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.greenLight,
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
    backgroundColor: COLORS.greenMuted,
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
