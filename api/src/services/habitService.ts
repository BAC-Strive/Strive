import { HabitModel } from "../models/habits";
import { HabitLogModel } from "../models/habitLogs";
import { HabitNotFoundError, HabitAlreadyCompletedError } from "../errors/habitErrors";
import type { CreateHabitInput } from "../validation/habit";
import { pointsFor, incrementPoints } from "./pointsService";
import { calculate, startOfDay } from "./streakService";

export type CompleteResult = {
  points: number; // point optjent ved denne gennemførsel
  streak: number;
  totalPoints: number; // brugerens samlede point efter gennemførslen
};

// Henter brugerens vaner, nyeste først
export async function getOverview(userId: string) {
  return HabitModel.find({ userId }).sort({ createdAt: -1 }).lean();
}

// Opretter en vane (US6). Input er allerede valideret og renset af createHabitSchema.
export async function createHabit(userId: string, input: CreateHabitInput) {
  const habit = await HabitModel.create({ userId, ...input });
  return habit.toObject();
}

// Sletter en vane og alle dens gennemførsler (US9)
export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  await HabitLogModel.deleteMany({ habitId });
  await HabitModel.deleteOne({ _id: habitId });
}


// Gennemfører en vane for i dag: opretter loggen, lægger point til og regner streaken ud
export async function completeHabit(userId: string, habitId: string): Promise<CompleteResult> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  const points = pointsFor(habit.difficulty);

  try {
    await HabitLogModel.create({ habitId, completedAt: startOfDay(new Date()), pointsAwarded: points });
  } catch (err) {
    // 11000 = brud på det unikke indeks (habitId + completedAt), dvs. allerede gennemført i dag
    if ((err as { code?: number }).code === 11000) {
      throw new HabitAlreadyCompletedError();
    }
    throw err;
  }

  const totalPoints = await incrementPoints(userId, points);

  const logs = await HabitLogModel.find({ habitId }).select("completedAt").lean();
  const streak = calculate(
    logs.map((log) => log.completedAt),
    habit.weekdays,
  );

  return { points, streak, totalPoints };
}
