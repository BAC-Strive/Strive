import { Types } from "mongoose";
import { UserModel } from "../models/user";
import { AppError } from "../errors/appError";
import { NotEnoughPointsError, PointsAlreadySpentError } from "../errors/habitErrors";

export type Difficulty = "let" | "middel" | "svær";

const POINTS: Record<Difficulty, number> = {
  let: 10,
  middel: 20,
  svær: 30,
};

// Et skjold koster så mange gange dagens point for vanen
export const PROTECTION_MULTIPLIER = 3;

export function pointsFor(difficulty: Difficulty): number {
  return POINTS[difficulty];
}

// Prisen på et skjold til en vane: 30, 60 eller 90 point
export function protectionCostFor(difficulty: Difficulty): number {
  return pointsFor(difficulty) * PROTECTION_MULTIPLIER;
}

// Lægger point til brugerens totalPoints og returnerer det nye total.
// $inc er atomisk, så samtidige kald ikke overskriver hinanden.
export async function incrementPoints(userId: Types.ObjectId | string, amount: number): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    // Kodefejl og ikke brugerinput, så almindelig Error (giver 500)
    throw new Error("amount skal være et positivt heltal");
  }

  const user = await UserModel.findOneAndUpdate(
    { _id: userId },
    { $inc: { totalPoints: amount } },
    { returnDocument: "after", projection: { totalPoints: 1 } },
  ).lean();
  if (!user) {
    throw new AppError(404, "Brugeren findes ikke");
  }
  return user.totalPoints;
}

// Trækker point fra brugerens totalPoints og returnerer det nye total. Totalen kan aldrig komme under 0:
// kontrollen (totalPoints >= amount) står i selve opdateringen, så to samtidige træk ikke begge kan
// lykkes. Har brugeren ikke nok, kaster vi den fejl, som den, der kalder, giver med.
async function takePoints(
  userId: Types.ObjectId | string,
  amount: number,
  notEnough: () => Error,
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    // Kodefejl og ikke brugerinput, så almindelig Error (giver 500)
    throw new Error("amount skal være et positivt heltal");
  }

  const user = await UserModel.findOneAndUpdate(
    { _id: userId, totalPoints: { $gte: amount } },
    { $inc: { totalPoints: -amount } },
    { returnDocument: "after", projection: { totalPoints: 1 } },
  ).lean();
  if (!user) {
    // Enten findes brugeren ikke, eller også er der ikke point nok
    if (!(await UserModel.exists({ _id: userId }))) {
      throw new AppError(404, "Brugeren findes ikke");
    }
    throw notEnough();
  }
  return user.totalPoints;
}

// Bruger point (fx på et skjold). Fejler med "Du har ikke nok point".
export function spendPoints(userId: Types.ObjectId | string, amount: number): Promise<number> {
  return takePoints(userId, amount, () => new NotEnoughPointsError());
}

// Trækker de point tilbage, en gennemførsel gav (ved fortryd). Har brugeren brugt pointene, fejler det,
// så man ikke kan gennemføre, bruge pointene og fortryde for at få dem gratis.
export function decrementPoints(userId: Types.ObjectId | string, amount: number): Promise<number> {
  return takePoints(userId, amount, () => new PointsAlreadySpentError());
}
