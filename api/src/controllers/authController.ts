import { Router } from "express";
import * as authService from "../services/authService";
import { loginSchema, parseOrThrow, registerSchema } from "../validation/auth";
import { requireAuth } from "../middleware/requireAuth";

// Samler alle /auth-routes. Mountes i app.ts under "/auth".
// Fejl kastet i handlerne sendes automatisk videre til errorHandler (Express 5),
// som sender dem tilbage til klienten med passende statuskode og fejlbesked.
export const authRouter = Router();

// POST /auth/register: opretter en bruger og logger den ind (US1)
authRouter.post("/register", async (req, res) => {
	// Kaster ValidationError (400), hvis et felt mangler eller er ugyldigt
	const input = parseOrThrow(registerSchema, req.body);

	// Returnerer token og offentlige brugerdata. Kaster EmailTakenError (409), hvis emailen er i brug.
	const result = await authService.register(input);

	res.status(201).json(result);
});

// POST /auth/login: logger en eksisterende bruger ind (US2)
authRouter.post("/login", async (req, res) => {
	// Kaster ValidationError (400), hvis email eller adgangskode mangler eller er ugyldig
	const input = parseOrThrow(loginSchema, req.body);

	// Returnerer token og offentlige brugerdata. Kaster InvalidCredentialsError (401) ved forkert login.
	const result = await authService.login(input);

	res.status(200).json(result);
});

// GET /auth/me: henter den indloggede bruger.
// Bruges af appen ved opstart til at tjekke, om den gemte token stadig er gyldig.
authRouter.get("/me", requireAuth, async (req, res) => {
	// requireAuth har altid sat userId her, så "!" fortæller TypeScript, at den ikke er undefined
	const user = await authService.getCurrentUser(req.userId!);
	res.json({ user });
});