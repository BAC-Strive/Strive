import { z } from "zod";
import { ValidationError } from "../errors/authErrors";

// Renser først (mellemrum, store bogstaver), og tjekker så formatet
const email = z.string().trim().toLowerCase().pipe(z.email("Ugyldig email"));

export const registerSchema = z.object({
  username: z.string().trim().min(1, "Fornavn skal udfyldes").max(50, "Fornavn må højst være 50 tegn"),
  email,
  // Max 72, fordi bcrypt ignorerer alt efter 72 tegn
  password: z
    .string()
    .min(8, "Adgangskoden skal være mindst 8 tegn")
    .max(72, "Adgangskoden må højst være 72 tegn"),
});

export const loginSchema = z.object({
  email,
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