import { request } from "./client";
import { saveToken } from "../auth/tokenStorage";

// Samme felter som toPublicUser i backend
export type User = {
  id: string;
  username: string;
  email: string;
  totalPoints: number;
};

type AuthResult = { token: string; user: User };

// Opretter bruger, gemmer tokenen og returnerer brugeren (US1)
export async function register(username: string, email: string, password: string): Promise<User> {
  const { token, user } = await request<AuthResult>("/auth/register", {
    method: "POST",
    body: { username, email, password },
    auth: false,
  });
  await saveToken(token);
  return user;
}

// Logger ind, gemmer tokenen og returnerer brugeren (US2)
export async function login(email: string, password: string): Promise<User> {
  const { token, user } = await request<AuthResult>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  await saveToken(token);
  return user;
}

// Henter den indloggede bruger ud fra den gemte token. Bruges ved opstart.
export async function getMe(): Promise<User> {
  const { user } = await request<{ user: User }>("/auth/me");
  return user;
}
