# Strive

## BAC-94 Konto: Hvad er lavet

Backend-delen af Konto fra MVP'en (US1 Opret bruger og US2 Log ind), samt auth-middleware til at beskytte routes.

| Endpoint | Beskrivelse | Svar |
|---|---|---|
| `POST /auth/register` | Opretter bruger og logger ind | 201 `{ token, user }` |
| `POST /auth/login` | Logger ind med email og adgangskode | 200 `{ token, user }` |
| `GET /auth/me` | Henter den indloggede bruger ud fra token | 200 `{ user }` |

## ⚠️ Det skal I gøre efter merge

1. Kør `npm install` i `api`, da der er nye pakker (`bcryptjs`, `jsonwebtoken`, `zod`).
2. **Tilføj JWT-indstillinger til jeres `.env`**

   Serveren skal bruge en hemmelig nøgle til at underskrive login-tokens. Den ligger i `.env`, som ikke kommer med i Git, så I skal hver især tilføje den selv.

   a. Åbn `api/.env`. Findes den ikke, så lav en kopi af `api/.env.example` og kald den `.env`.

   b. Generér en tilfældig nøgle ved at køre denne kommando i terminalen:

      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

      Den skriver en lang streng ud af tal og bogstaver, fx `3f9a1c...`.

   c. Tilføj disse to linjer i `.env`, og indsæt din egen nøgle:

      JWT_SECRET=<indsæt strengen fra trin b>
      JWT_EXPIRES_IN=30d

      `JWT_EXPIRES_IN` bestemmer, hvor længe man forbliver logget ind (her 30 dage).

   d. Genstart serveren. `.env` læses kun, når serveren starter, så `npm run dev` skal stoppes (Ctrl+C) og startes igen.

   Uden `JWT_SECRET` kan serveren godt starte, men oprettelse og login fejler.
   Nøglen må ikke deles eller committes. Det er fint, at vi har hver vores lokalt.

## Sådan beskytter I jeres routes

Sæt `requireAuth` foran routen. Brugerens id ligger så i `req.userId`:

```ts
import { requireAuth } from "../middleware/requireAuth";

router.get("/habits", requireAuth, async (req, res, next) => {
  const habits = await HabitModel.find({ userId: req.userId });
  // ...
});
```

Appen skal sende tokenen som header: `Authorization: Bearer <token>`.
Mangler tokenen, eller er den ugyldig eller udløbet, svarer middlewaren med 401.

## Ændringer i User-modellen

- `username` er ikke længere unikt. Det er et visningsnavn og vises som "Fornavn" i appen. Login sker med email.
- `passwordHash` har `select: false` og hentes ikke med som standard.
- Nyt: `comparePassword()` og `toPublicUser()`, som sikrer, at hashen aldrig sendes til appen.

## Beslutninger værd at kende

- Duplikeret email giver **409 Conflict** (ikke 400 som i diagrammerne). Diagrammerne for US1 skal opdateres.
- Login giver samme fejlbesked, uanset om emailen eller adgangskoden er forkert, og svartiden er den samme i begge tilfælde (beskyttelse mod at afsløre, hvilke emails der har en konto).
- `GET /auth/me` er nyt og står ikke i diagrammerne. Appen bruger det ved opstart til at tjekke den gemte token.

## Testet manuelt

- [x] Oprettelse giver token og bruger uden `passwordHash`
- [x] Samme email to gange giver 409
- [x] For kort adgangskode giver 400
- [x] Login med korrekte oplysninger, også med store bogstaver i email
- [x] Forkert adgangskode og ukendt email giver samme 401
- [x] `/auth/me` med gyldig token giver brugeren, uden eller med falsk token giver 401

## Mangler (kommer i en senere PR)

- Automatiske tests med Jest
- Frontend: ApiClient, AuthContext, Navigation og LoginSignupScreen
