import { request } from "./client";
import type { CompleteResult, Habit, NewHabit, OverviewHabit, UndoResult } from "../types/habit";

// Henter brugerens vaner med streak og dagens status, nyeste først
export function getHabits(): Promise<OverviewHabit[]> {
  return request<OverviewHabit[]>("/habits");
}

// Opretter en vane og returnerer den gemte vane (US6)
export function createHabit(habit: NewHabit): Promise<Habit> {
  return request<Habit>("/habits", { method: "POST", body: habit });
}

// Sletter en vane og alle dens gennemførsler (US9)
export function deleteHabit(id: string): Promise<void> {
  return request<void>(`/habits/${encodeURIComponent(id)}`, { method: "DELETE" });
}

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
