import { request } from "./client";
import type { CompleteResult, UndoResult } from "../types/habit";

// 201 { pointsAwarded, streak, totalPoints }
// Fejl: 400 "Vanen skal ikke gennemføres i dag" | 404 "Vanen findes ikke" | 409 "Vanen er allerede gennemført i dag"
export function completeHabit(habitId: string): Promise<CompleteResult> {
  return request<CompleteResult>(`/habits/${encodeURIComponent(habitId)}/complete`, {
    method: "POST",
  });
}

// Fortryder dagens gennemførsel og trækker pointene tilbage.
// 200 { pointsRemoved, streak, totalPoints }
// Fejl: 404 "Vanen findes ikke" | 409 "Vanen er ikke gennemført i dag"
export function undoCompleteHabit(habitId: string): Promise<UndoResult> {
  return request<UndoResult>(`/habits/${encodeURIComponent(habitId)}/complete`, {
    method: "DELETE",
  });
}
