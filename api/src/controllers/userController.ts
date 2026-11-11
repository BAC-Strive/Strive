import { Router } from "express";
import * as userService from "../services/userService";
import { parseOrThrow } from "../validation/auth";
import { updateProfileSchema } from "../validation/user";
import { requireAuth } from "../middleware/requireAuth";

// Samler alle user routes i en router, som kan eksporteres og bruges i app.ts. Mountes i app.ts under "/users".
// Alle routes i denne router kræver authentication (login), da requireAuth middleware er brugt på routeren.
export const userRouter = Router();
userRouter.use(requireAuth);

// PATCH /users/me: opdaterer fornavn og/eller email (US3)
// PATCH frem for PUT, da kun de felter, der sendes med, ændres. PUT ville kræve hele brugeren hver gang.
userRouter.patch("/me", async (req, res) => {
  // Kaster ValidationError (400), hvis input er ugyldigt eller tomt.
  const changes = parseOrThrow(updateProfileSchema, req.body);

  // Kaster EmailTakenError (409), hvis emailen allerede er i brug af en anden bruger.
  const user = await userService.updateProfile(req.userId!, changes);

  // Returnerer den opdaterede bruger. toPublicUser sikrer, at passwordHash aldrig kommer med.
  res.json({ user });
});
