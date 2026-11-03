import { useRef, useState, type ComponentRef } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { COLORS } from "../theme/colors";

type Mode = "login" | "register";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Samme regler som backend, så brugeren får besked med det samme uden at vente på serveren.
// Backend validerer stadig, da man kan kalde API'et uden om appen.
function validate(mode: Mode, username: string, email: string, password: string): string | null {
  if (mode === "register" && username.trim() === "") return "Fornavn skal udfyldes";
  if (!EMAIL_PATTERN.test(email.trim())) return "Ugyldig email";
  if (password === "") return "Adgangskode skal udfyldes";
  if (mode === "register" && password.length < 8) return "Adgangskoden skal være mindst 8 tegn";
  return null;
}

export default function LoginSignupScreen() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bruges til at hoppe til næste felt, når man trykker "Næste" på tastaturet.
  // ComponentRef finder selv den type, et TextInput-felt har som ref.
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const isRegister = mode === "register";

  async function handleSubmit() {
    const validationError = validate(mode, username, email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(username.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      // Ved succes skifter navigationen selv til vaneoversigten, fordi user sættes i AuthContext
    } catch (err) {
      // ApiError indeholder backends besked, fx "Forkert email eller adgangskode"
      setError(err instanceof ApiError ? err.message : "Noget gik galt. Prøv igen.");
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError(null);
    setPassword("");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Skubber indholdet op, så tastaturet ikke dækker knappen */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isRegister ? "Opret konto" : "Velkommen tilbage"}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? "Kom i gang med at bygge dine vaner" : "Log ind for at se dine vaner"}
          </Text>

          {isRegister ? (
            <View style={styles.field}>
              <Text style={styles.label}>Fornavn</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!isSubmitting}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Adgangskode</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              // Lader iOS foreslå en stærk adgangskode ved oprettelse og udfylde den gemte ved login
              autoComplete={isRegister ? "new-password" : "current-password"}
              textContentType={isRegister ? "newPassword" : "password"}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isSubmitting}
            />
            {isRegister ? <Text style={styles.hint}>Mindst 8 tegn</Text> : null}
          </View>

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, (pressed || isSubmitting) && styles.buttonPressed]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>{isRegister ? "Opret konto" : "Log ind"}</Text>
            )}
          </Pressable>

          <Text style={styles.switchText}>
            {isRegister ? "Har du allerede en konto? " : "Ny bruger? "}
            <Text style={styles.switchLink} onPress={isSubmitting ? undefined : switchMode}>
              {isRegister ? "Log ind" : "Opret en konto"}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 48 },
  title: { fontSize: 30, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 16, color: COLORS.muted, marginTop: 8, marginBottom: 32 },
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
  hint: { fontSize: 13, color: COLORS.muted, marginTop: 6 },
  error: { color: COLORS.error, fontSize: 14, marginBottom: 12 },
  button: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: "600" },
  switchText: { textAlign: "center", marginTop: 20, fontSize: 15, color: COLORS.muted },
  switchLink: { color: COLORS.greenDark, fontWeight: "700" },
});
