import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "../errors/authErrors";

// Beskytter en route, så kun brugere med en gyldig token kan tilgå den.
// Brug: router.get("/habits", requireAuth, handler) - så vil handler kun blive kaldt, hvis brugeren har en gyldig token.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
	// Appen sender tokenen som: Authorization: Bearer <token>
	const header = req.headers.authorization;
	// Hvis der ikke er nogen token, så send en 401 Unauthorized-fejl.
	if (!header?.startsWith("Bearer ")) {
		return next(new UnauthorizedError());
	}

	try {
		// Hvis tokenen er gyldig, så sæt req.userId til brugerens id, så routes kan se, hvem der spørger.
		// slice fjerner "Bearer " fra starten af headeren, så vi kun sender selve tokenen til verifyToken.
		req.userId = verifyToken(header.slice("Bearer ".length));
		// Hvis verifyToken ikke kaster en fejl, så er tokenen gyldig,
		// og vi kan kalde next() for at gå videre til næste middleware eller route-handler.
		next();
	} catch {
		// Hvis tokenen ikke er gyldig eller udløbet, så send en 401 Unauthorized-fejl.
		next(new UnauthorizedError());
	}
}