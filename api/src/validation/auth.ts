import { z } from "zod";
import { ValidationError } from "../errors/authErrors";

// Delte felter, så oprettelse og redigering af profil følger samme regler
export const emailField = z.string().trim().toLowerCase().pipe(z.email("Ugyldig email"));
export const usernameField = z
  .string()
  .trim()
  .min(1, "Fornavn skal udfyldes")
  .max(50, "Fornavn må højst være 50 tegn");

export const registerSchema = z.object({
  username: usernameField,
  email: emailField,
  // Max 72, da bcrypt kun bruger de første 72 bytes (æ, ø og å fylder 2 bytes hver)
  password: z
    .string()
    .min(8, "Adgangskoden skal være mindst 8 tegn")
    .max(72, "Adgangskoden må højst være 72 tegn"),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Adgangskode skal udfyldes"),
});

// Typer udledt fra skemaerne, så de altid passer sammen
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Returnerer det validerede input, eller kaster en 400 med den første fejlbesked
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "Ugyldigt input");
  }
  return result.data;
}
