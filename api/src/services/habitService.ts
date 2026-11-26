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
import { PROTECTION_REASON_TEXT, protectionStatus } from "./rewardService";
import { calculate, isCompletedToday, includesDay, splitLogDates, startOfDay } from "./streakService";

export type CompleteResult = {
  pointsAwarded: number; // point optjent ved denne gennemførsel
  pointsRefunded: number; // prisen på et skjold, der blev refunderet (0 hvis dagen ikke var beskyttet)
  streak: number;
  totalPoints: number; // brugerens samlede point efter gennemførslen
};

export type UndoResult = {
  pointsRemoved: number; // point trukket tilbage ved fortrydelsen
  streak: number;
  totalPoints: number; // brugerens samlede point efter fortrydelsen
};

// Henter brugerens vaner, nyeste først, med streak, dagens status og om et skjold kan købes (bruges af HabitCard)
export async function getOverview(userId: string) {
  const habits = await HabitModel.find({ userId }).sort({ createdAt: -1 }).lean();

  // Henter alle vanernes logs i ét kald i stedet for ét kald pr. vane
  const logs = await HabitLogModel.find({ habitId: { $in: habits.map((h) => h._id) } })
    .select("habitId completedAt isProtected")
    .lean();

  // Samler logs pr. vane i ét gennemløb. String(), fordi ObjectId'er ikke kan sammenlignes med ===.
  const logsByHabit = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = String(log.habitId);
    const list = logsByHabit.get(key);
    if (list) list.push(log);
    else logsByHabit.set(key, [log]);
  }

  const today = new Date();
  return habits.map((habit) => {
    const { completedDates, protectedDates } = splitLogDates(logsByHabit.get(String(habit._id)) ?? []);
    const protection = protectionStatus({
      weekdays: habit.weekdays,
      difficulty: habit.difficulty,
      completedDates,
      protectedDates,
      today,
    });

    return {
      ...habit,
      streak: protection.streak,
      completedToday: isCompletedToday(completedDates, today),
      protectedToday: includesDay(protectedDates, today),
      scheduledToday: habit.weekdays.includes(today.getDay()),
      protection: {
        available: protection.available,
        cost: protection.cost,
        reason: protection.reason ? PROTECTION_REASON_TEXT[protection.reason] : null,
      },
    };
  });
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

// Regner vanens streak ud fra dens logs (gennemførte dage og skjolde)
async function streakFor(habitId: string, weekdays: number[]): Promise<number> {
  const logs = await HabitLogModel.find({ habitId }).select("completedAt isProtected").lean();
  const { completedDates, protectedDates } = splitLogDates(logs);
  return calculate(completedDates, weekdays, new Date(), protectedDates);
}

// Gennemfører en vane for i dag: opretter loggen, lægger point til og regner streaken ud.
// Er dagen beskyttet med et skjold, bliver skjoldet til en gennemførsel, og skjoldets pris refunderes.
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

  // Findes der et skjold i dag, gøres det om til en gennemførsel (atomisk). "before" giver os skjoldets pris.
  const shield = await HabitLogModel.findOneAndUpdate(
    { habitId, completedAt: startOfDay(today), isProtected: true },
    { isProtected: false, pointsAwarded, pointsSpent: 0 },
    { returnDocument: "before" },
  );
  const pointsRefunded = shield?.pointsSpent ?? 0;

  let createdId;
  if (!shield) {
    try {
      const log = await HabitLogModel.create({ habitId, completedAt: startOfDay(today), pointsAwarded });
      createdId = log._id;
    } catch (err) {
      // 11000 = brud på det unikke indeks (habitId + completedAt), dvs. allerede gennemført i dag
      if ((err as { code?: number }).code === 11000) {
        throw new HabitAlreadyCompletedError();
      }
      throw err;
    }
  }

  let totalPoints: number;
  try {
    totalPoints = await incrementPoints(userId, pointsAwarded + pointsRefunded);
  } catch (err) {
    // Vi har ikke transaktioner på en enkelt MongoDB-server. Ændringen rulles tilbage, så brugeren
    // ikke mister point og kan prøve igen (ellers ville det give 409).
    if (shield) {
      await HabitLogModel.updateOne(
        { _id: shield._id },
        { isProtected: true, pointsAwarded: 0, pointsSpent: pointsRefunded },
      );
    } else {
      await HabitLogModel.deleteOne({ _id: createdId });
    }
    throw err;
  }

  const streak = await streakFor(habitId, habit.weekdays);

  return { pointsAwarded, pointsRefunded, streak, totalPoints };
}

// Fortryder dagens gennemførsel (US8): sletter loggen og trækker de point tilbage, den gav.
// Et skjold er ikke en gennemførsel og røres ikke. Er gennemførslen opstået af et skjold, bliver
// refunderingen stående, og dagen er bagefter ubeskyttet.
export async function undoCompleteHabit(userId: string, habitId: string): Promise<UndoResult> {
  const habit = await HabitModel.findOne({ _id: habitId, userId });
  if (!habit) {
    throw new HabitNotFoundError();
  }

  // findOneAndDelete er atomisk, så to fortryd-kald samtidig ikke begge trækker point fra
  const log = await HabitLogModel.findOneAndDelete({
    habitId,
    completedAt: startOfDay(new Date()),
    isProtected: { $ne: true },
  });
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

  const streak = await streakFor(habitId, habit.weekdays);

  return { pointsRemoved: log.pointsAwarded, streak, totalPoints };
}
