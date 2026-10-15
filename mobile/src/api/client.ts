const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error(`Serveren svarede ${res.status}`);
  return res.json();
}