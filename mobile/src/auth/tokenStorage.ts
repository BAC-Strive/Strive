import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "strive.authToken";

// Gemmer tokenen krypteret på enheden ved hjælp af SecureStore. (Keychain på iOS og Keystore på Android)
// Dette sikrer, at tokenen ikke er tilgængelig for andre apps eller brugere på enheden.
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

// Henter tokenen fra SecureStore.
// Hvis tokenen ikke findes, returneres null.
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// Sletter tokenen fra SecureStore.
// Bruges ved log ud og når backend afviser tokenen (f.eks. ved udløb eller ugyldighed).
export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
