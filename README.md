# Strive

Strive er en vane-app, hvor man opretter vaner, vælger hvilke ugedage de skal gennemføres, og optjener point og streaks, når man klarer dem.

Projektet består af to dele:

| Mappe | Indhold |
|---|---|
| `api/` | Backend: Node.js, Express 5, TypeScript og MongoDB (Mongoose) |
| `mobile/` | App: React Native med Expo og React Navigation |

## Funktioner (MVP)

- Opret bruger og log ind (JWT, token gemmes sikkert på telefonen)
- Opret en vane med navn, ugedage og sværhedsgrad (let, middel, svær)
- Vaneoversigt med streak og dagens status
- Gennemfør en vane og optjen point efter sværhedsgrad (10, 20 og 30)
- Fortryd en gennemførsel, så pointene trækkes tilbage
- Slet en vane og alle dens registreringer (langt tryk på kortet)

## Krav

- Node.js 20 eller nyere
- Docker (til MongoDB), eller en MongoDB der kører lokalt
- Expo Go på telefonen, eller en emulator

## Kom i gang

### 1. Backend

```bash
cd api
npm install
cp .env.example .env
```

Åbn `api/.env` og udfyld `JWT_SECRET`. Generér en tilfældig nøgle med:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Variabel | Beskrivelse | Standard |
|---|---|---|
| `PORT` | Port til API'et | `3000` |
| `MONGO_URI` | Adresse på MongoDB | `mongodb://localhost:27017/strive` |
| `JWT_SECRET` | Hemmelig nøgle til login-tokens (**påkrævet**) | – |
| `JWT_EXPIRES_IN` | Hvor længe et login gælder | `30d` |

`.env` kommer ikke med i Git. Nøglen må ikke deles eller committes. `.env` læses kun ved opstart, så genstart serveren efter ændringer.

Start MongoDB og derefter API'et:

```bash
# fra projektets rod
docker compose up -d mongo

# fra api/
npm run dev
```

Tjek, at serveren kører: `http://localhost:3000/health` skal svare `{ "status": "ok" }`.

**Alt i Docker:** `docker compose up --build` starter både MongoDB og API'et. Det kræver, at `api/.env` findes.

### 2. Mobilapp

```bash
cd mobile
npm install
```

Opret `mobile/.env` med computerens IP-adresse, da en fysisk telefon ikke kan bruge `localhost`:

```
EXPO_PUBLIC_API_URL=http://<computerens-ip>:3000
```

Telefonen og computeren skal være på samme netværk. På en Android-emulator er adressen `http://10.0.2.2:3000`. Uden denne variabel bruger appen `http://localhost:3000`.

Start appen og scan QR-koden med Expo Go:

```bash
npm start
```

Genstart Expo (`npm start`) efter ændringer i `.env`.

## Scripts

| Mappe | Kommando | Hvad den gør |
|---|---|---|
| `api` | `npm run dev` | Starter serveren med automatisk genstart |
| `api` | `npm run build` | Bygger til `dist/` |
| `api` | `npm start` | Kører den byggede server |
| `api` | `npm test` | Kører alle tests (Jest) |
| `api` | `npm run typecheck` | Tjekker TypeScript-typer |
| `mobile` | `npm start` | Starter Expo |
| `mobile` | `npm run typecheck` | Tjekker TypeScript-typer |

Testene kører uden database og uden `.env`. De bruger en fast testnøgle (`api/tests/setupEnv.ts`).

## API

Alle routes undtagen `/health` og `/auth/register` og `/auth/login` kræver headeren `Authorization: Bearer <token>`. Mangler tokenen, eller er den ugyldig eller udløbet, svarer API'et med 401.

| Endpoint | Beskrivelse | Svar |
|---|---|---|
| `GET /health` | Tjekker, at serveren kører | 200 |
| `POST /auth/register` | Opretter bruger og logger ind | 201 `{ token, user }` |
| `POST /auth/login` | Logger ind med email og adgangskode | 200 `{ token, user }` |
| `GET /auth/me` | Henter den indloggede bruger | 200 `{ user }` |
| `GET /habits` | Brugerens vaner, nyeste først, med `streak`, `completedToday`, `protectedToday`, `scheduledToday` og `protection { available, cost, reason }` | 200 |
| `POST /habits` | Opretter en vane (`name`, `weekdays`, `difficulty`) | 201 |
| `DELETE /habits/:id` | Sletter en vane og dens gennemførsler | 204 |
| `POST /habits/:id/complete` | Gennemfører vanen i dag. Er dagen beskyttet med et skjold, bliver skjoldet til en gennemførsel, og prisen refunderes | 201 `{ pointsAwarded, pointsRefunded, streak, totalPoints }` |
| `DELETE /habits/:id/complete` | Fortryder dagens gennemførsel. Fejler, hvis pointene er brugt | 200 `{ pointsRemoved, streak, totalPoints }` |
| `POST /habits/:id/protect` | Køber et skjold til i dag, så streaken ikke brydes (koster 3 gange dagens point for vanen) | 201 `{ pointsSpent, totalPoints }` |
| `DELETE /habits/:id/protect` | Fortryder dagens skjold og refunderer prisen | 200 `{ pointsRefunded, totalPoints }` |

Fejl: `400` ved ugyldigt input eller hvis vanen ikke skal gennemføres (eller beskyttes) i dag, `404` hvis vanen ikke findes, `409` hvis vanen allerede er gennemført i dag, eller hvis emailen allerede er i brug.

For skjold og fortryd giver `409` også: vanen er allerede beskyttet eller ikke beskyttet i dag, der er ingen streak at beskytte, brugeren har ikke point nok, eller brugeren ikke har point nok til at fortryde en gennemførsel (pointene er brugt).

**Skjold (streak-beskyttelse):** et skjold gælder kun for i dag og kun på en dag, vanen er planlagt til. Det tæller ikke med i streaken, men bryder den heller ikke. Man kan ikke beskytte en vane uden streak eller en dag, der allerede er gennemført eller beskyttet. Gennemfører man dagen alligevel, refunderes skjoldet. Point kan ikke komme under 0.

`weekdays` er et tal fra 0 til 6 som i `Date.getDay()`: 0 er søndag og 6 er lørdag.

## Gode at vide

- **Tidszone:** Hvad der tæller som "i dag", afgøres af serverens tidszone. Docker-opsætningen sætter `TZ=Europe/Copenhagen`. Kører du API'et uden Docker, bruges computerens tidszone. Sæt `TZ` selv, hvis serveren kører et andet sted.
- **Én gennemførsel pr. vane pr. dag** sikres af et unikt indeks i databasen.
- **Login-fejl:** Forkert email og forkert adgangskode giver samme besked og samme svartid, så man ikke kan se, hvilke emails der har en konto.
- **Brugernavn** er et visningsnavn og er ikke unikt. Login sker med email.
- `passwordHash` hentes ikke med som standard og sendes aldrig til appen.

## Arbejdsgang

- `main` er den stabile gren. `develop` er den, vi arbejder ud fra.
- Lav en gren pr. opgave, navngivet efter Jira-nummeret, fx `BAC-113-opdater-readme`, og åbn en pull request mod `develop`.
- CI (GitHub Actions) kører typecheck og tests for `api` og `mobile`. Checket `ci-ok` skal være grønt før merge.

## Kendte begrænsninger

- Mobilappen har endnu ingen automatiske tests eller lint.
- Der er ingen pull-to-refresh. Vaneoversigten hentes igen, når skærmen får fokus.
