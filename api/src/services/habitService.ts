import { HabitModel } from "../models/habits";
import { HabitLogModel } from "../models/habitLogs";
import {
  HabitNotFoundError,
  HabitAlreadyCompletedError,
  HabitNotCompletedError,
  HabitNotScheduledError,
} from "../errors/habitErrors";
import type { CreateHabitInput } from "../validation/habit";
import { pointsFor, incrementPoints, decrementPoints } from "./pointsService";
import { calculate, startOfDay } from "./streakService";

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

// Gennemfører en vane for i dag: opretter loggen, lægger point til og regner streaken ud.
// Antagelse (MVP): "i dag" er serverens dag (startOfDay bruger serverens tidszone).
// En vane kan kun gennemføres på de ugedage, der står i weekdays.
export async function completeHabit(userId: string, habitId: string): Promise<CompleteResult> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  const today = new Date();
  if (!habit.weekdays.includes(today.getDay())) {
    throw new HabitNotScheduledError();
  }

  const pointsAwarded = pointsFor(habit.difficulty);

  let log;
  try {
    log = await HabitLogModel.create({ habitId, completedAt: startOfDay(today), pointsAwarded });
  } catch (err) {
    // 11000 = brud på det unikke indeks (habitId + completedAt), dvs. allerede gennemført i dag
    if ((err as { code?: number }).code === 11000) {
      throw new HabitAlreadyCompletedError();
    }
    throw err;
  }

  let totalPoints: number;
  try {
    totalPoints = await incrementPoints(userId, pointsAwarded);
  } catch (err) {
    // Vi har ikke transaktioner på en enkelt MongoDB-server. Loggen slettes igen, så brugeren
    // ikke mister point og kan prøve at gennemføre vanen igen (ellers ville det give 409).
    await HabitLogModel.deleteOne({ _id: log._id });
    throw err;
  }

  const logs = await HabitLogModel.find({ habitId }).select("completedAt").lean();
  const streak = calculate(
    logs.map((log) => log.completedAt),
    habit.weekdays,
  );

  return { pointsAwarded, streak, totalPoints };
}

// Fortryder dagens gennemførsel (US8): sletter loggen og trækker de point tilbage, den gav
export async function undoCompleteHabit(userId: string, habitId: string): Promise<UndoResult> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  // findOneAndDelete er atomisk, så to fortryd-kald samtidig ikke begge trækker point fra
  const log = await HabitLogModel.findOneAndDelete({ habitId, completedAt: startOfDay(new Date()) });
  if (!log) {
    throw new HabitNotCompletedError();
  }

  let totalPoints: number;
  try {
    totalPoints = await decrementPoints(userId, log.pointsAwarded);
  } catch (err) {
    // Samme princip som i completeHabit: loggen lægges tilbage, så point og log passer sammen
    await HabitLogModel.create({
      habitId,
      completedAt: log.completedAt,
      pointsAwarded: log.pointsAwarded,
    });
    throw err;
  }

  const logs = await HabitLogModel.find({ habitId }).select("completedAt").lean();
  const streak = calculate(
    logs.map((l) => l.completedAt),
    habit.weekdays,
  );

  return { pointsRemoved: log.pointsAwarded, streak, totalPoints };
}
