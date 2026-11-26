import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api/client";
import type { Protection } from "../types/habit";
import { COLORS } from "../theme/colors";

type Props = {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  scheduledToday?: boolean; // Er vanen planlagt til i dag? Hvis ikke, vises "Ikke i dag" (backenden afviser med 400)
  protectedToday?: boolean; // Har vanen et skjold i dag? Så er streaken sikret, og man kan stadig gennemføre
  protection?: Protection; // Kan der købes et skjold? Og hvad koster det?
  notice?: string; // Kort besked under kortet, fx at et skjold er refunderet
  totalPoints?: number; // Brugerens point, så "Beskyt" er grå, hvis man ikke har råd
  onComplete: (id: string) => Promise<void>;
  onUndo?: (id: string) => Promise<void>; // Vises som "Fortryd", når vanen er gennemført i dag
  onProtect?: (id: string) => Promise<void>; // Vises som "Beskyt", når et skjold kan købes
  onUnprotect?: (id: string) => Promise<void>; // Vises som "Fortryd beskyttelse", når dagen er beskyttet
};

export default function HabitCard({
  id,
  name,
  streak,
  completedToday,
  scheduledToday = true,
  protectedToday = false,
  protection,
  notice,
  totalPoints,
  onComplete,
  onUndo,
  onProtect,
  onUnprotect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kører en handling (gennemfør, fortryd, beskyt ...). Viser indlæsning undervejs og en dansk fejlbesked, hvis det fejler.
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

  // Viser prisen, før der købes et skjold
  function confirmProtect() {
    if (!onProtect || !protection) return;
    Alert.alert(
      "Beskyt din streak?",
      `Det koster ${protection.cost} point. Din streak bliver ikke brudt i dag. Gennemfører du "${name}" alligevel, får du pointene tilbage.`,
      [
        { text: "Annuller", style: "cancel" },
        { text: `Beskyt (${protection.cost} point)`, onPress: () => run(onProtect) },
      ],
    );
  }

  function confirmUnprotect() {
    if (!onUnprotect) return;
    const refund = protection ? `Du får ${protection.cost} point tilbage, og` : "Du får pointene tilbage, og";
    Alert.alert("Fortryd beskyttelse?", `${refund} streaken er ikke længere beskyttet i dag.`, [
      { text: "Annuller", style: "cancel" },
      { text: "Ja, fortryd beskyttelse", style: "destructive", onPress: () => run(onUnprotect) },
    ]);
  }

  const notScheduled = !completedToday && !scheduledToday;
  const disabled = completedToday || notScheduled || loading;

  // "Beskyt" vises, når dagen hverken er gennemført eller beskyttet. Den er grå, hvis det ikke kan lade
  // sig gøre i dag, eller hvis brugeren ikke har point nok. Serveren afviser stadig med 409.
  const showProtect = !!onProtect && !!protection && !completedToday && !protectedToday;
  const affordable = protection === undefined || totalPoints === undefined || totalPoints >= protection.cost;
  const protectDisabled = loading || !protection?.available || !affordable;
  // Forklaring under en grå "Beskyt". "Ikke i dag" er allerede tydeligt på hovedknappen.
  let protectHint: string | null = null;
  if (showProtect && scheduledToday) {
    if (!protection?.available) protectHint = protection?.reason ?? null;
    else if (!affordable) protectHint = "Ikke nok point";
  }

  return (
    <View
      style={[
        styles.card,
        completedToday && styles.cardDone,
        protectedToday && !completedToday && styles.cardProtected,
      ]}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.streak}>🔥 {streak} {streak === 1 ? "dags" : "dages"} streak</Text>
        {protectedToday && !completedToday ? (
          <Text style={styles.shieldText}>🛡 Beskyttet i dag. Gennemfør alligevel for at få pointene tilbage.</Text>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
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

        {protectedToday && !completedToday && onUnprotect && (
          <Pressable
            onPress={confirmUnprotect}
            disabled={loading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fortryd beskyttelse"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={[styles.shieldLink, loading && styles.buttonLoading]}>Fortryd beskyttelse</Text>
          </Pressable>
        )}

        {showProtect && (
          <View style={styles.protectBlock}>
            <Pressable
              onPress={confirmProtect}
              disabled={protectDisabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Beskyt streak for ${protection?.cost} point`}
              accessibilityState={{ disabled: protectDisabled }}
            >
              <Text style={[styles.shieldLink, protectDisabled && styles.shieldLinkOff]}>
                🛡 Beskyt ({protection?.cost} point)
              </Text>
            </Pressable>
            {protectHint ? <Text style={styles.protectHint}>{protectHint}</Text> : null}
          </View>
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
  cardProtected: {
    backgroundColor: COLORS.shieldLight,
    borderColor: COLORS.shield,
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
  shieldText: {
    color: COLORS.shield,
  },
  notice: {
    color: COLORS.greenDark,
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
  protectBlock: {
    alignItems: "center",
    gap: 2,
  },
  shieldLink: {
    color: COLORS.shield,
    textDecorationLine: "underline",
  },
  shieldLinkOff: {
    color: COLORS.muted,
    textDecorationLine: "none",
  },
  protectHint: {
    color: COLORS.muted,
    fontSize: 12,
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
