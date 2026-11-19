// Frontend-typer. Adskilt fra backend-modellerne, så id er en string her.

// Svar fra POST /habits/:id/complete
export type CompleteResult = {
  pointsAwarded: number; // point optjent ved denne gennemførsel
  pointsRefunded: number; // prisen på et skjold, der blev refunderet (0 hvis dagen ikke var beskyttet)
  streak: number;
  totalPoints: number; // brugerens samlede point efter gennemførslen
};

// Svar fra DELETE /habits/:id/complete
export type UndoResult = {
  pointsRemoved: number; // point trukket tilbage ved fortrydelsen
  streak: number;
  totalPoints: number; // brugerens samlede point efter fortrydelsen
};

// Svar fra POST /habits/:id/protect
export type ProtectResult = {
  pointsSpent: number; // prisen på skjoldet
  totalPoints: number; // brugerens samlede point efter købet
};

// Svar fra DELETE /habits/:id/protect
export type UnprotectResult = {
  pointsRefunded: number; // point givet tilbage
  totalPoints: number; // brugerens samlede point efter fortrydelsen
};

export type Difficulty = "let" | "middel" | "svær";

// Samme felter som en vane fra backend (HabitModel)
export type Habit = {
  _id: string;
  userId: string;
  name: string;
  weekdays: number[]; // 0 = søndag … 6 = lørdag, samme som Date.getDay()
  difficulty: Difficulty;
  createdAt: string;
};

// Kan der købes et skjold til vanen i dag? Point tjekkes ikke her, det gør appen (user.totalPoints).
export type Protection = {
  available: boolean;
  cost: number; // prisen i point (3 gange dagens point for vanen)
  reason: string | null; // hvorfor det ikke kan lade sig gøre, fx "Ingen streak at beskytte"
};

// En vane fra GET /habits, hvor backend også har regnet streak og dagens status ud
export type OverviewHabit = Habit & {
  streak: number;
  completedToday: boolean;
  protectedToday: boolean; // har vanen et skjold i dag?
  scheduledToday: boolean; // er vanen planlagt til i dag (efter serverens dag)?
  protection: Protection;
};

// Det man sender ved oprettelse. Resten sætter backend selv.
export type NewHabit = Pick<Habit, "name" | "weekdays" | "difficulty">;
