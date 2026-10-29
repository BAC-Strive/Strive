import { Types } from "mongoose";
import { UserModel } from "../models/user";
import { AppError } from "../errors/appError";
import { ValidationError } from "../errors/authErrors";

export type Difficulty = "let" | "middel" | "svær";

const POINTS: Record<Difficulty, number> = {
  let: 10,
  middel: 20,
  svær: 30,
};

export function pointsFor(difficulty: Difficulty): number {
  return POINTS[difficulty];
}

// Lægger point til brugerens totalPoints. $inc er atomisk, så samtidige kald ikke overskriver hinanden.
export async function incrementPoints(userId: Types.ObjectId | string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError("amount skal være et positivt heltal");
  }

  const result = await UserModel.updateOne({ _id: userId }, { $inc: { totalPoints: amount } });
  if (result.matchedCount === 0) {
    throw new AppError(404, "Brugeren findes ikke");
  }
}
