import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/colors";

type Props = {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  onComplete: (id: string) => Promise<void>;
};

export default function HabitCard({ id, name, streak, completedToday, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setLoading(true);
    setError(null);
    try {
      await onComplete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt. Prøv igen.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = completedToday || loading;

  return (
    <View style={[styles.card, completedToday && styles.cardDone]}>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.streak}>🔥 {streak} dages streak</Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Pressable
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[styles.button, completedToday && styles.buttonDone, loading && styles.buttonLoading]}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={[styles.buttonText, completedToday && styles.buttonTextDone]}>
            {completedToday ? "✓ Gjort i dag" : "Gennemfør"}
          </Text>
        )}
      </Pressable>
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
  buttonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  buttonTextDone: {
    color: COLORS.greenDark,
  },
});
