import { request } from "./client";
import type { User } from "./auth";

// Kun de felter, der skal ændres, sendes med (PATCH).
export type ProfileChanges = {
  username?: string;
  email?: string;
};

// Opdaterer fornavn og/eller email for den indloggede bruger (US3).
// Fejl: 400 ved ugyldigt input | 409 "Email er allerede i brug".
export async function updateProfile(changes: ProfileChanges): Promise<User> {
  const { user } = await request<{ user: User }>("/users/me", { method: "PATCH", body: changes});
  return user;
}
