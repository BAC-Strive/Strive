import { HabitModel } from "../models/habits";
import { HabitLogModel } from "../models/habitLogs";
import { HabitNotFoundError } from "../errors/habitErrors";
import type { CreateHabitInput } from "../validation/habit";

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
