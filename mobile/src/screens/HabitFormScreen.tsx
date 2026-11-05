import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { createHabit } from "../api/habits";
import { ApiError } from "../api/client";
import type { Difficulty } from "../types/habit";
import { COLORS } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "HabitForm">;

// Mandag først som i skitsen. value følger Date.getDay(): 0 = søndag … 6 = lørdag
const WEEKDAYS = [
  { value: 1, short: "M", name: "Mandag" },
  { value: 2, short: "T", name: "Tirsdag" },
  { value: 3, short: "O", name: "Onsdag" },
  { value: 4, short: "T", name: "Torsdag" },
  { value: 5, short: "F", name: "Fredag" },
  { value: 6, short: "L", name: "Lørdag" },
  { value: 0, short: "S", name: "Søndag" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "let", label: "Let" },
  { value: "middel", label: "Middel" },
  { value: "svær", label: "Svær" },
];

// Samme regler som backend, så brugeren får besked med det samme uden at vente på serveren.
// Backend validerer stadig, da man kan kalde API'et uden om appen.
function validate(name: string, weekdays: number[]): string | null {
  if (name.trim() === "") return "Navn skal udfyldes";
  if (weekdays.length === 0) return "Vælg mindst én dag";
  return null;
}

export default function HabitFormScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("middel");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tilføjer dagen, hvis den ikke er valgt, ellers fjernes den
  function toggleDay(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  async function handleSubmit() {
    const validationError = validate(name, weekdays);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createHabit({ name: name.trim(), weekdays, difficulty });
      // Tilbage til oversigten, som selv henter vanerne igen via useFocusEffect
      navigation.goBack();
    } catch (err) {
      // ApiError indeholder backends besked, fx "Navn må højst være 50 tegn"
      setError(err instanceof ApiError ? err.message : "Noget gik galt. Prøv igen.");
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Navn</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Fx Træn 30 minutter"
            placeholderTextColor={COLORS.muted}
            maxLength={50}
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ugedage</Text>
          <View style={styles.row}>
            {WEEKDAYS.map((day) => {
              const selected = weekdays.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  onPress={() => toggleDay(day.value)}
                  style={[styles.day, selected && styles.selected]}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day.name}
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={[styles.dayText, selected && styles.selectedText]}>{day.short}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sværhedsgrad</Text>
          <View style={styles.row}>
            {DIFFICULTIES.map((option) => {
              const selected = difficulty === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setDifficulty(option.value)}
                  style={[styles.difficulty, selected && styles.difficultySelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.difficultyText, selected && styles.difficultySelectedText]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Gem vane</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  field: { marginBottom: 24 },
  label: { fontSize: 14, color: COLORS.muted, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  row: { flexDirection: "row", gap: 8 },
  day: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  dayText: { fontSize: 16, color: COLORS.muted },
  selected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  selectedText: { color: COLORS.white, fontWeight: "600" },
  difficulty: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  difficultySelected: { borderColor: COLORS.green, borderWidth: 1.5 },
  difficultyText: { fontSize: 16, color: COLORS.muted },
  difficultySelectedText: { color: COLORS.greenDark, fontWeight: "600" },
  error: { color: COLORS.error, fontSize: 14, marginBottom: 12 },
  button: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  pressed: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: "600" },
});
