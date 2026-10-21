import { Router } from "express";
import * as authService from "../services/authService";
import { parseOrThrow, registerSchema } from "../validation/auth";

// Samler alle /auth-routes. Mountes i app.ts under "/auth".
export const authRouter = Router();

// POST /auth/register: opretter en bruger og logger den ind (US1)
authRouter.post("/register", async (req, res, next) => {
  try {
    const input = parseOrThrow(registerSchema, req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    // Sender fejlen videre til errorHandler, som laver svaret
    next(err);
  }
});