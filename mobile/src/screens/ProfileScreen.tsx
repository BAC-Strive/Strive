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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import type { ProfileChanges } from "../api/users";
import { COLORS } from "../theme/colors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Samme regler som ved oprettelse og som backend (US3)
function validate(username: string, email: string): string | null {
  if (username.trim() === "") return "Fornavn skal udfyldes";
  if (!EMAIL_PATTERN.test(email.trim())) return "Ugyldig email";
  return null;
}

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();

  // Felterne starter med brugerens nuværende oplysninger
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Kun de felter, der faktisk er ændret, sendes med (PATCH).
  // Email sammenlignes med små bogstaver, da backend gemmer den sådan.
  const changes: ProfileChanges = {};
  if (username.trim() !== user?.username) changes.username = username.trim();
  if (email.trim().toLowerCase() !== user?.email) changes.email = email.trim();
  const hasChanges = Object.keys(changes).length > 0;

  async function handleSave() {
    const validationError = validate(username, email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await updateProfile(changes);
      setSaved(true); // Bekræftelse til brugeren, som US3 kræver
    } catch (err) {
      // Fx "Email er allerede i brug" (409) fra backend
      setError(err instanceof ApiError ? err.message : "Noget gik galt. Prøv igen.");
    } finally {
      setIsSaving(false);
    }
  }

  // Skjuler "Gemt", så snart brugeren begynder at rette igen
  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setSaved(false);
    };
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Fornavn</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={edit(setUsername)}
            autoComplete="given-name"
            textContentType="givenName"
            maxLength={50}
            editable={!isSaving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={edit(setEmail)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!isSaving}
          />
        </View>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {saved ? (
          <View style={styles.saved} accessibilityRole="alert">
            <Ionicons name="checkmark-circle" size={20} color={COLORS.greenDark} />
            <Text style={styles.savedText}>Dine oplysninger er gemt</Text>
          </View>
        ) : null}

        {/* Knappen er kun aktiv, når der er noget at gemme */}
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
          style={({ pressed }) => [
            styles.button,
            (!hasChanges || isSaving) && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasChanges || isSaving }}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Gem ændringer</Text>
          )}
        </Pressable>

        {/* Navigationen skifter selv til login, når brugeren logges ud */}
        <Pressable
          onPress={logout}
          disabled={isSaving}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Log ud</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  field: { marginBottom: 20 },
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
  error: { color: COLORS.error, fontSize: 14, marginBottom: 12 },
  saved: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  savedText: { color: COLORS.greenDark, fontSize: 14, fontWeight: "600" },
  button: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: "600" },
  logout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  logoutText: { color: COLORS.error, fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
