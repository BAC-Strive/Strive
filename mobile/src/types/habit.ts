// Frontend-typer. Adskilt fra backend-modellerne, så id er en string her.

export type CompleteResult = {
  pointsAwarded: number; // point optjent ved denne gennemførsel
  streak: number;
  totalPoints: number; // brugerens samlede point efter gennemførslen
};

export type UndoResult = {
  pointsRemoved: number; // point trukket tilbage ved fortrydelsen
  streak: number;
  totalPoints: number; // brugerens samlede point efter fortrydelsen
};
