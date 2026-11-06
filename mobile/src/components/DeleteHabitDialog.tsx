import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Habit } from "../types/habit";
import { COLORS } from "../theme/colors";

type Props = {
  habit: Habit | null; // null betyder, at dialogen er lukket
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

// Bekræftelse før en vane slettes (US9). Oversigten styrer, hvad der sker ved "Slet".
export default function DeleteHabitDialog({ habit, isDeleting, error, onCancel, onConfirm }: Props) {
  // Husker det sidste navn, så titlen ikke bliver tom, mens dialogen toner ud (habit er så allerede null)
  const [shownName, setShownName] = useState(habit?.name ?? "");
  if (habit && habit.name !== shownName) {
    setShownName(habit.name);
  }

  // Lukning er slået fra under sletning, så en færdig sletning ikke kan lukke en anden vanes dialog
  function handleClose() {
    if (!isDeleting) onCancel();
  }

  return (
    <Modal
      visible={habit !== null}
      transparent
      animationType="fade"
      onRequestClose={handleClose} // Androids tilbage-knap lukker dialogen
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Ionicons name="warning-outline" size={32} color={COLORS.error} />
          <Text style={styles.title}>Slet "{shownName}"?</Text>
          <Text style={styles.message}>Vanen og alle dens registreringer slettes permanent.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttons}>
            <Pressable
              onPress={handleClose}
              disabled={isDeleting}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Annuller</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isDeleting}
              style={({ pressed }) => [styles.button, styles.delete, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              {isDeleting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.deleteText}>Slet</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    backgroundColor: COLORS.overlay,
  },
  dialog: { backgroundColor: COLORS.background, borderRadius: 24, padding: 24 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.text, textAlign: "center", marginTop: 12 },
  message: { fontSize: 15, color: COLORS.muted, textAlign: "center", marginTop: 8, lineHeight: 22 },
  error: { fontSize: 14, color: COLORS.error, textAlign: "center", marginTop: 12 },
  buttons: { flexDirection: "row", gap: 12, marginTop: 24 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  cancel: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { fontSize: 16, color: COLORS.text },
  delete: { backgroundColor: COLORS.error },
  deleteText: { fontSize: 16, color: COLORS.white, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
