import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { completeHabit, deleteHabit, getHabits } from "../api/habits";
import { ApiError } from "../api/client";
import type { Habit, OverviewHabit } from "../types/habit";
import HabitCard from "../components/HabitCard";
import DeleteHabitDialog from "../components/DeleteHabitDialog";
import { COLORS } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "HabitOverview">;

export default function HabitOverviewScreen({ navigation }: Props) {
  const [habits, setHabits] = useState<OverviewHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vanen, der er ved at blive slettet. null betyder, at dialogen er lukket.
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Henter vanerne, hver gang skærmen vises, også når man kommer tilbage fra "Ny vane".
  // useCallback sørger for, at det kun sker ved fokus og ikke ved hver render.
  useFocusEffect(
    useCallback(() => {
      // Bliver false, hvis man forlader skærmen, før svaret kommer, så vi ikke opdaterer en skærm, der ikke vises
      let isActive = true;

      async function loadHabits() {
        try {
          const data = await getHabits();
          if (isActive) {
            setHabits(data);
            setError(null);
          }
        } catch (err) {
          if (isActive) setError(err instanceof ApiError ? err.message : "Kunne ikke hente vaner");
        } finally {
          if (isActive) setIsLoading(false);
        }
      }

      loadHabits();
      return () => {
        isActive = false;
      };
    }, []),
  );

  // Kaldes af HabitCard. Fejl sendes videre, så kortet selv kan vise beskeden.
  async function handleComplete(id: string) {
    const result = await completeHabit(id);
    setHabits((current) =>
      current.map((habit) =>
        habit._id === id ? { ...habit, completedToday: true, streak: result.streak } : habit,
      ),
    );
  }

  function closeDeleteDialog() {
    setHabitToDelete(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!habitToDelete) return;
    const id = habitToDelete._id;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteHabit(id);
      removeFromList(id);
    } catch (err) {
      // 404: vanen findes ikke længere (fx slettet på en anden telefon), så den skal også væk her
      if (err instanceof ApiError && err.status === 404) {
        removeFromList(id);
      } else {
        setDeleteError(err instanceof ApiError ? err.message : "Kunne ikke slette vanen");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // Fjerner vanen fra listen med det samme, så vi ikke skal hente alle vaner igen
  function removeFromList(id: string) {
    setHabits((current) => current.filter((habit) => habit._id !== id));
    closeDeleteDialog();
  }

  // Spinner vises kun første gang. Senere opdateres listen stille i baggrunden.
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.green} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.content}
        data={habits}
        keyExtractor={(habit) => habit._id}
        renderItem={({ item }) => (
          // Langt tryk på kortet åbner slet-dialogen. Knappen "Gennemfør" i kortet virker stadig som normalt.
          <Pressable
            onLongPress={() => setHabitToDelete(item)}
            accessibilityHint="Hold inde for at slette vanen"
          >
            <HabitCard
              id={item._id}
              name={item.name}
              streak={item.streak}
              completedToday={item.completedToday}
              onComplete={handleComplete}
            />
          </Pressable>
        )}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : undefined}
        ListEmptyComponent={
          error ? undefined : <Text style={styles.empty}>Du har ingen vaner endnu. Opret din første!</Text>
        }
        ListFooterComponent={
          <Pressable
            onPress={() => navigation.navigate("HabitForm")}
            style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color={COLORS.muted} />
            <Text style={styles.newButtonText}>Ny vane</Text>
          </Pressable>
        }
      />

      <DeleteHabitDialog
        habit={habitToDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onCancel={closeDeleteDialog}
        onConfirm={handleDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: "center", alignItems: "center" },
  content: { padding: 24, gap: 12 },
  empty: { fontSize: 15, color: COLORS.muted, textAlign: "center", marginVertical: 16 },
  error: { fontSize: 14, color: COLORS.error, marginBottom: 4 },
  newButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 18,
  },
  newButtonText: { fontSize: 17, color: COLORS.muted },
  pressed: { opacity: 0.7 },
});
