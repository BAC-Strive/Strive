import { Router } from "express";
import * as authService from "../services/authService";
import { loginSchema, parseOrThrow, registerSchema } from "../validation/auth";
import { requireAuth } from "../middleware/requireAuth";

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

// POST /auth/login: logger en eksisterende bruger ind (US2)
authRouter.post("/login", async (req, res, next) => {
	try {
		// Kaster en ValidationError (400), hvis email eller adgangskode mangler eller er ugyldig.
		const input = parseOrThrow(loginSchema, req.body);

		// Returnerer token og brugerens offentlige data (uden passwordHash) ved succesfuld login. 
		// Kaster InvalidCredentialsError (401) ved forkert email eller adgangskode.
		const result = await authService.login(input);

		// Sender token og brugerens offentlige data (uden passwordHash) tilbage til klienten.
		res.status(200).json(result);
		// Hvis der opstår en fejl, sendes den videre til errorHandler, som laver svaret.
	} catch (err) {
		next(err);
	}
});

// GET /auth/me: henter den indloggede bruger.
// Bruges af appen ved opstart til at tjekke, om den gemte token stadig er gyldig.
authRouter.get("/me", requireAuth, async (req, res, next) => {
	try {
		// userId er altid sat af requireAuth først, så vi kan bruge "!" for at fortælle TypeScript, at den ikke er undefined.
		const user = await authService.getCurrentUser(req.userId!);
		res.json({ user });
	} catch (err) {
		next(err);
	}
});