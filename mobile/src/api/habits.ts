import { request } from "./client";
import type { CompleteResult, Habit, NewHabit, OverviewHabit } from "../types/habit";

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

// Kontrakt: 201 { pointsAwarded, streak, totalPoints } | 404 "Vanen findes ikke" | 409 "Vanen er allerede gennemført i dag"
export function completeHabit(habitId: string): Promise<CompleteResult> {
  return request<CompleteResult>(`/habits/${encodeURIComponent(habitId)}/complete`, {
    method: "POST",
  });
}
