import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { deleteToken, getToken } from "./tokenStorage";

// Det, som alle skærme får adgang til via useAuth()
type AuthContextValue = {
  user: User | null; // null betyder, at ingen bruger er logget ind
  isLoading: boolean; // true, mens appen tjekker en gemt token ved opstart
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Delt auth-state for hele appen; null betyder at der ikke er nogen AuthProvider
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ved opstart: findes der en gemt token, så hent brugeren og spring login over
  useEffect(() => {
    async function restoreSession() {
      try {
        if (await getToken()) {
          setUser(await authApi.getMe());
        }
      } catch {
        // En ugyldig token er allerede slettet af client.ts. Ved netværksfejl vises login.
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Hvis backend senere afviser token, fx fordi den er udløbet,
  // så logges brugeren ud overalt i appen
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  // Login, register og logout opdaterer user-state, så alle skærme får den nye bruger eller null
  async function login(email: string, password: string) {
    setUser(await authApi.login(email, password));
  }

  async function register(username: string, email: string, password: string) {
    setUser(await authApi.register(username, email, password));
  }

  async function logout() {
    await deleteToken(); // slet token fra storage, så appen ikke kan logge ind igen
    setUser(null);
  }

  // AuthContext.Provider gør auth-state tilgængelig for alle skærme, som bruger useAuth()
  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Bruges af skærme, som vil læse auth-state eller kalde login/logout/register
// const { user, login } = useAuth();
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth skal bruges inden i AuthProvider");
  return context;
}
