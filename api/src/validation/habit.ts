import { z } from "zod";
import { DIFFICULTIES } from "../models/habits";

const weekday = z
  .number("Dage skal være tal")
  .int("Dage skal være hele tal")
  .min(0, "Dage skal være mellem 0 og 6")
  .max(6, "Dage skal være mellem 0 og 6");

export const createHabitSchema = z.object(
  {
    name: z
      .string("Navn skal være en tekst")
      .trim()
      .min(1, "Navn skal udfyldes")
      .max(50, "Navn må højst være 50 tegn"),
    // 0 = søndag … 6 = lørdag, samme som Date.getDay()
    weekdays: z
      .array(weekday, "Dage skal være en liste af tal")
      .min(1, "Vælg mindst én dag")
      // Fjern dubletter og sortér, så [3, 1, 1] gemmes som [1, 3]
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    difficulty: z.enum(DIFFICULTIES, "Sværhedsgrad skal være let, middel eller svær"),
  },
  "Ugyldigt input"
);

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
