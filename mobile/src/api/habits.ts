import { request } from "./client";
import type {
  CompleteResult,
  Habit,
  NewHabit,
  OverviewHabit,
  ProtectResult,
  UndoResult,
  UnprotectResult,
} from "../types/habit";

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

// 201 { pointsAwarded, pointsRefunded, streak, totalPoints }
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

// Køber et skjold til i dag, så streaken ikke brydes. Koster 3 gange dagens point for vanen.
// 201 { pointsSpent, totalPoints }
// Fejl: 400 "Vanen skal ikke gennemføres i dag" | 404 | 409 (allerede gennemført/beskyttet, ingen streak, ikke nok point)
export function protectHabit(habitId: string): Promise<ProtectResult> {
  return request<ProtectResult>(`/habits/${encodeURIComponent(habitId)}/protect`, {
    method: "POST",
  });
}

// Fortryder dagens skjold og giver pointene tilbage.
// 200 { pointsRefunded, totalPoints }
// Fejl: 404 "Vanen findes ikke" | 409 "Vanen er ikke beskyttet i dag"
export function unprotectHabit(habitId: string): Promise<UnprotectResult> {
  return request<UnprotectResult>(`/habits/${encodeURIComponent(habitId)}/protect`, {
    method: "DELETE",
  });
}
