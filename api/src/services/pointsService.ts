export type Difficulty = "let" | "middel" | "svær";

const POINTS: Record<Difficulty, number> = {
  let: 10,
  middel: 20,
  svær: 30,
};

export function pointsFor(difficulty: Difficulty): number {
  return POINTS[difficulty];
}
