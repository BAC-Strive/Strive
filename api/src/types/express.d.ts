// Express' Request-type kender ikke feltet userId, da det er noget, vi selv tilføjer.
// requireAuth sætter req.userId, når en token er gyldig, så routes kan se, hvem der spørger. 
// Uden denne fil ville TypeScript give en fejl, hver gang vi skriver req.userId.
//
// "declare global" tilføjer feltet til Express' eksisterende Request-type i stedet for
// at lave en ny. Det er valgfrit (?), fordi det kun er sat på routes bag requireAuth. 
declare global {
  namespace Express {
    interface Request {
			userId?: string;
		}
  }
}

// Gør filen til et modul, så TypeScript ikke klager over,
// at vi bruger "declare global" uden for et modul.
export {};