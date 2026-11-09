import { z } from "zod";
import { emailField, usernameField } from "./auth";

// Skema til opdatering af profil, hvor både username og email er valgfrie, men mindst én skal angives.
// Andre felter, fx totalPoints, fjernes automatisk af zod, så de ikke kan ændres via profilen.
export const updateProfileSchema = z
  .object({
    username: usernameField.optional(),
    email: emailField.optional(),
  })
  // Ekstra tjek for at sikre, at mindst ét af felterne er angivet
  .refine(
    (data) => data.username !== undefined || data.email !== undefined,
    "Angiv fornavn eller email for at opdatere profilen"
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
