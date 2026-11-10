// Tjekker, om en fejl fra MongoDB skyldes et brud på det unikke index på et bestemt felt (kode 11000).
// Tjekker feltet, så en dublet på et andet felt ikke fejlagtigt bliver til "email er allerede i brug".
export function isDuplicateKeyError(err: unknown, field: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; keyPattern?: Record<string, unknown> };
  // Kode 11000 er MongoDBs fejlkode for “dublet på et unikt felt”.
  return e.code === 11000 && e.keyPattern?.[field] !== undefined;
}
