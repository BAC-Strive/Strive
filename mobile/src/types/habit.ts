// Frontend-typer. Adskilt fra backend-modellerne, så id er en string her.

// Svar fra POST /habits/:id/complete
export type CompleteResult = {
  pointsAwarded: number; // point optjent ved denne gennemførsel
  streak: number;
  totalPoints: number; // brugerens samlede point efter gennemførslen
};

// Svar fra DELETE /habits/:id/complete
export type UndoResult = {
  pointsRemoved: number; // point trukket tilbage ved fortrydelsen
  streak: number;
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

// En vane fra GET /habits, hvor backend også har regnet streak og dagens status ud
export type OverviewHabit = Habit & {
  streak: number;
  completedToday: boolean;
};

// Det man sender ved oprettelse. Resten sætter backend selv.
export type NewHabit = Pick<Habit, "name" | "weekdays" | "difficulty">;
