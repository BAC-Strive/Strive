import { request } from "./client";
import type { CompleteResult } from "../types/habit";

// Kontrakt: 201 { points, streak, totalPoints } | 404 "Vanen findes ikke" | 409 "Vanen er allerede gennemført i dag"
export function completeHabit(habitId: string): Promise<CompleteResult> {
  return request<CompleteResult>(`/habits/${encodeURIComponent(habitId)}/complete`, {
    method: "POST",
  });
}
