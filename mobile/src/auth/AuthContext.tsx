import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User } from "../api/auth";
import * as usersApi from "../api/users";
import type { ProfileChanges } from "../api/users";
import { setUnauthorizedHandler } from "../api/client";
import { deleteToken, getToken } from "./tokenStorage";

// Det, som alle skærme får adgang til via useAuth()
type AuthContextValue = {
  user: User | null; // null betyder, at ingen bruger er logget ind
  isLoading: boolean; // true, mens appen tjekker en gemt token ved opstart
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTotalPoints: (totalPoints: number) => void; // opdaterer brugerens point efter gennemfør/fortryd
  updateProfile: (changes: ProfileChanges) => Promise<void>; // gemmer ændringer i profilen og opdaterer brugeren (US3)
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
    await deleteToken(); // slet tokenen, så brugeren ikke logges automatisk ind ved næste opstart
    setUser(null);
  }

  // Kaldes med totalPoints fra svaret på gennemfør/fortryd, så user.totalPoints er den ene kilde til
  // pointene. Den funktionelle opdatering sikrer, at to hurtige svar ikke overskriver andre ændringer.
  function updateTotalPoints(totalPoints: number) {
    setUser((current) => (current ? { ...current, totalPoints } : current));
  }

  // Gemmer ændringerne i backend og opdaterer brugeren med svaret, så nyt fornavn og ny email vises overalt.
  // Kaster en ApiError ved fejl, fx 409, som profilskærmen viser til brugeren.
  async function updateProfile(changes: ProfileChanges) {
    setUser(await usersApi.updateProfile(changes));
  }

  // AuthContext.Provider gør auth-state tilgængelig for alle skærme, som bruger useAuth()
  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateTotalPoints, updateProfile }}>
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
