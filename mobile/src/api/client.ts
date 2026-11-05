import { deleteToken, getToken } from "../auth/tokenStorage";

// Adressen på backend. Sættes i .env, da telefonen skal bruge computerens IP-adresse.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// Fejl fra API'et med statuskode og besked.
// Beskeden kommer fra backend og kan vises direkte til brugeren.
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Kaldes, når backend afviser en gemt token (fx fordi den er udløbet eller ugyldig).
// Sættes af AuthContext.
let onUnauthorized: (() => void) | null = null;

// Lader AuthContext bestemme, hvad der sker, når en gemt token afvises (normalt: log ud og vis login).
// På den måde behøver client.ts ikke kende til AuthContext eller navigationen.
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // Vedhæft token. Standard er true. Sættes til false ved login og oprettelse.
};

// Fælles funktion til alle kald til backend.
// Vedhæfter token, sender body som JSON og laver fejlsvar om til en ApiError.
// <T> angiver typen på svaret, fx request<User>(...).
export async function request<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  // Fortæller backend, at body er JSON
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Henter den gemte token og sender den med som "Authorization: Bearer <token>"
  const token = auth ? await getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch fejler kun ved netværksproblemer, fx forkert IP-adresse eller serveren er nede
    throw new ApiError(0, "Kunne ikke forbinde til serveren");
  }

  // 204 No Content (fx ved sletning) har ingen body.
  // .catch(() => null) sikrer, at et svar, der ikke er JSON, ikke får appen til at crashe.
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  // res.ok er true for statuskoder 200-299
  if (!res.ok) {
    // Kun når en gemt token blev afvist. Forkert login giver også 401, men sendes uden token.
    if (res.status === 401 && token) {
      await deleteToken();
      onUnauthorized?.();
    }
    // Bruger backends fejlbesked, fx "Email er allerede i brug", hvis den findes
    throw new ApiError(res.status, data?.message ?? `Serveren svarede ${res.status}`);
  }

  return data as T;
}

// Tjekker, om backend kører. Kræver ikke login.
export async function getHealth(): Promise<{ status: string }> {
  return request("/health", { auth: false });
}
