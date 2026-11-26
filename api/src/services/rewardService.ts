import { HabitModel } from "../models/habits";
import { HabitLogModel } from "../models/habitLogs";
import {
  HabitNotFoundError,
  HabitAlreadyCompletedError,
  HabitAlreadyProtectedError,
  HabitDayTakenError,
  HabitNotProtectedError,
  HabitNotScheduledError,
  NoStreakToProtectError,
} from "../errors/habitErrors";
import { incrementPoints, protectionCostFor, spendPoints, type Difficulty } from "./pointsService";
import { calculate, includesDay, splitLogDates, startOfDay } from "./streakService";

export type ProtectResult = {
  pointsSpent: number; // prisen på skjoldet
  totalPoints: number; // brugerens samlede point efter købet
};

export type UnprotectResult = {
  pointsRefunded: number; // point givet tilbage ved fortrydelsen
  totalPoints: number; // brugerens samlede point efter fortrydelsen
};

// Hvorfor en vane ikke kan beskyttes i dag
export type ProtectionReason = "not-scheduled" | "completed" | "protected" | "no-streak";

// Teksten, appen viser, når "Beskyt" ikke kan bruges
export const PROTECTION_REASON_TEXT: Record<ProtectionReason, string> = {
  "not-scheduled": "Ikke planlagt i dag",
  completed: "Allerede gennemført i dag",
  protected: "Allerede beskyttet i dag",
  "no-streak": "Ingen streak at beskytte",
};

type ProtectionInput = {
  weekdays: number[];
  difficulty: Difficulty;
  completedDates: Date[];
  protectedDates: Date[];
  today: Date;
};

// Reglerne for et skjold ét sted, så oversigten og købet altid er enige:
// kun planlagte dage, kun i dag, ikke en dag der allerede er gennemført eller beskyttet,
// og der skal være en streak at beskytte. Point tjekkes ikke her, det gør spendPoints.
export function protectionStatus({ weekdays, difficulty, completedDates, protectedDates, today }: ProtectionInput) {
  // Streaken, som den er før i dag (er i dag ikke gennemført, starter calculate fra i går)
  const streak = calculate(completedDates, weekdays, today, protectedDates);

  let reason: ProtectionReason | null = null;
  if (!weekdays.includes(today.getDay())) reason = "not-scheduled";
  else if (includesDay(completedDates, today)) reason = "completed";
  else if (includesDay(protectedDates, today)) reason = "protected";
  else if (streak === 0) reason = "no-streak";

  return { available: reason === null, cost: protectionCostFor(difficulty), reason, streak };
}

function errorFor(reason: ProtectionReason) {
  switch (reason) {
    case "not-scheduled":
      return new HabitNotScheduledError();
    case "completed":
      return new HabitAlreadyCompletedError();
    case "protected":
      return new HabitAlreadyProtectedError();
    case "no-streak":
      return new NoStreakToProtectError();
  }
}

// Køber et skjold til i dag: opretter en beskyttet log og trækker prisen fra brugerens point.
// Antagelse (MVP): "i dag" er serverens dag, som ved gennemførsel.
export async function protectStreak(userId: string, habitId: string): Promise<ProtectResult> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  const today = new Date();
  const logs = await HabitLogModel.find({ habitId }).select("completedAt isProtected").lean();
  const { completedDates, protectedDates } = splitLogDates(logs);

  const status = protectionStatus({
    weekdays: habit.weekdays,
    difficulty: habit.difficulty,
    completedDates,
    protectedDates,
    today,
  });
  if (status.reason) {
    throw errorFor(status.reason);
  }

  let log;
  try {
    log = await HabitLogModel.create({
      habitId,
      completedAt: startOfDay(today),
      pointsAwarded: 0,
      isProtected: true,
      pointsSpent: status.cost,
    });
  } catch (err) {
    // 11000 = to kald kom samtidigt, og dagen har fået en log, siden vi læste logs ovenfor.
    // Vi ved ikke, om det blev en gennemførsel eller et skjold, så beskeden dækker begge dele.
    if ((err as { code?: number }).code === 11000) {
      throw new HabitDayTakenError();
    }
    throw err;
  }

  let totalPoints: number;
  try {
    totalPoints = await spendPoints(userId, status.cost);
  } catch (err) {
    // Ikke nok point (eller en fejl): skjoldet slettes igen, så der ikke ligger et gratis skjold
    await HabitLogModel.deleteOne({ _id: log._id });
    throw err;
  }

  return { pointsSpent: status.cost, totalPoints };
}

// Fortryder dagens skjold og giver de point tilbage, det kostede
export async function unprotectStreak(userId: string, habitId: string): Promise<UnprotectResult> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  // findOneAndDelete er atomisk, så to fortryd samtidig ikke begge refunderer
  const log = await HabitLogModel.findOneAndDelete({
    habitId,
    completedAt: startOfDay(new Date()),
    isProtected: true,
  });
  if (!log) {
    throw new HabitNotProtectedError();
  }

  let totalPoints: number;
  try {
    totalPoints = await incrementPoints(userId, log.pointsSpent);
  } catch (err) {
    // Refunderingen fejlede: skjoldet lægges tilbage, så brugeren ikke mister både skjold og point
    await HabitLogModel.create({
      habitId,
      completedAt: log.completedAt,
      pointsAwarded: 0,
      isProtected: true,
      pointsSpent: log.pointsSpent,
    });
    throw err;
  }

  return { pointsRefunded: log.pointsSpent, totalPoints };
}
