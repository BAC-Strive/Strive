// Frontend-typer. Adskilt fra backend-modellerne, så id er en string her.

export type CompleteResult = {
  points: number; // point optjent ved denne gennemførsel
  streak: number;
  totalPoints: number; // brugerens samlede point efter gennemførslen
};
