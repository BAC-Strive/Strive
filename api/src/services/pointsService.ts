import { Types } from "mongoose";
import { UserModel } from "../models/user";
import { AppError } from "../errors/appError";
import { NotEnoughPointsError } from "../errors/habitErrors";

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

// Trækker point fra brugerens totalPoints og returnerer det nye total. Totalen bliver aldrig under 0.
// Bruger en pipeline-opdatering, så fradraget og grænsen ved 0 sker atomisk i ét kald.
export async function decrementPoints(userId: Types.ObjectId | string, amount: number): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    // Kodefejl og ikke brugerinput, så almindelig Error (giver 500)
    throw new Error("amount skal være et positivt heltal");
  }

  const user = await UserModel.findOneAndUpdate(
    { _id: userId },
    [{ $set: { totalPoints: { $max: [0, { $subtract: ["$totalPoints", amount] }] } } }],
    { returnDocument: "after", updatePipeline: true, projection: { totalPoints: 1 } },
  ).lean();
  if (!user) {
    throw new AppError(404, "Brugeren findes ikke");
  }
  return user.totalPoints;
}

// Bruger point (fx på et skjold) og returnerer det nye total. Fejler med "Du har ikke nok point",
// hvis brugeren ikke har nok. Kontrollen sker i selve opdateringen (totalPoints >= amount), så to
// samtidige køb ikke kan sende totalen under 0.
export async function spendPoints(userId: Types.ObjectId | string, amount: number): Promise<number> {
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
    throw new NotEnoughPointsError();
  }
  return user.totalPoints;
}
