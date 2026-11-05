import { Types } from "mongoose";
import * as habitService from "../../src/services/habitService";
import { HabitModel } from "../../src/models/habits";
import { HabitLogModel } from "../../src/models/habitLogs";
import { HabitNotFoundError, HabitAlreadyCompletedError } from "../../src/errors/habitErrors";
import { incrementPoints } from "../../src/services/pointsService";

// incrementPoints mockes, så testene ikke rører brugermodellen. pointsFor er uændret.
jest.mock("../../src/services/pointsService", () => ({
  ...jest.requireActual("../../src/services/pointsService"),
  incrementPoints: jest.fn(),
}));
const incrementPointsMock = incrementPoints as jest.Mock;

// Erstatter databasedelen af modellerne med mocks. Resten af filerne, fx DIFFICULTIES, er uændret.
jest.mock("../../src/models/habits", () => ({
  ...jest.requireActual("../../src/models/habits"),
  HabitModel: {
    find: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock("../../src/models/habitLogs", () => ({
  ...jest.requireActual("../../src/models/habitLogs"),
  HabitLogModel: {
    deleteMany: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  },
}));

// Fortæller TypeScript, at metoderne nu er mocks, så vi kan bruge fx mockResolvedValue
const habitModel = HabitModel as unknown as Record<"find" | "create" | "findOne" | "deleteOne", jest.Mock>;
const habitLogModel = HabitLogModel as unknown as Record<"deleteMany" | "create" | "find", jest.Mock>;

const userId = new Types.ObjectId().toString();
const habitId = new Types.ObjectId().toString();
const input = { name: "Løb en tur", weekdays: [1, 3], difficulty: "middel" as const };

// find(...).sort(...).lean() er en kæde, så mocken skal returnere objekter med sort og lean
function mockFind(result: unknown) {
  const lean = jest.fn().mockResolvedValue(result);
  const sort = jest.fn().mockReturnValue({ lean });
  habitModel.find.mockReturnValue({ sort });
  return sort;
}

// Nulstiller alle mocks, så testene ikke påvirker hinanden
beforeEach(() => {
  jest.resetAllMocks();
});

describe("getOverview", () => {
  it("henter kun brugerens egne vaner, nyeste først", async () => {
    const habits = [{ _id: habitId, userId, ...input }];
    const sort = mockFind(habits);

    const result = await habitService.getOverview(userId);

    expect(result).toEqual(habits);
    expect(habitModel.find).toHaveBeenCalledWith({ userId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});

describe("createHabit", () => {
  it("gemmer vanen på brugeren og returnerer den", async () => {
    const saved = { _id: habitId, userId, ...input };
    habitModel.create.mockResolvedValue({ toObject: () => saved });

    const result = await habitService.createHabit(userId, input);

    expect(habitModel.create).toHaveBeenCalledWith({ userId, ...input });
    expect(result).toEqual(saved);
  });
});

describe("deleteHabit", () => {
  it("sletter vanens logs og derefter vanen (US9)", async () => {
    habitModel.findOne.mockResolvedValue({ _id: habitId, userId });

    await habitService.deleteHabit(userId, habitId);

    expect(habitLogModel.deleteMany).toHaveBeenCalledWith({ habitId });
    expect(habitModel.deleteOne).toHaveBeenCalledWith({ _id: habitId });
  });

  it("sletter logs før vanen", async () => {
    habitModel.findOne.mockResolvedValue({ _id: habitId, userId });

    await habitService.deleteHabit(userId, habitId);

    const logsDeletedAt = habitLogModel.deleteMany.mock.invocationCallOrder[0];
    const habitDeletedAt = habitModel.deleteOne.mock.invocationCallOrder[0];
    expect(logsDeletedAt).toBeLessThan(habitDeletedAt);
  });

  // userId i filteret er det, der forhindrer, at man sletter andres vaner
  it("leder kun efter vanen blandt brugerens egne", async () => {
    habitModel.findOne.mockResolvedValue({ _id: habitId, userId });

    await habitService.deleteHabit(userId, habitId);

    expect(habitModel.findOne).toHaveBeenCalledWith({ _id: habitId, userId });
  });

  it("kaster HabitNotFoundError og sletter intet, hvis vanen ikke findes eller tilhører en anden", async () => {
    habitModel.findOne.mockResolvedValue(null);

    await expect(habitService.deleteHabit(userId, habitId)).rejects.toThrow(HabitNotFoundError);

    expect(habitLogModel.deleteMany).not.toHaveBeenCalled();
    expect(habitModel.deleteOne).not.toHaveBeenCalled();
  });
});


describe("completeHabit", () => {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const habit = { _id: habitId, userId, name: "Løb en tur", weekdays: allDays, difficulty: "middel" };

  // find(...).select(...).lean() er en kæde, så mocken skal returnere objekter med select og lean
  function mockLogs(dates: Date[]) {
    const lean = jest.fn().mockResolvedValue(dates.map((completedAt) => ({ completedAt })));
    const select = jest.fn().mockReturnValue({ lean });
    habitLogModel.find.mockReturnValue({ select });
  }

  function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  it("opretter en log for i dag med vanens point", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    incrementPointsMock.mockResolvedValue(20);
    mockLogs([today()]);

    await habitService.completeHabit(userId, habitId);

    expect(habitLogModel.create).toHaveBeenCalledWith({
      habitId,
      completedAt: today(),
      pointsAwarded: 20,
    });
  });

  it("lægger vanens point til brugeren og returnerer points, streak og totalPoints", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    incrementPointsMock.mockResolvedValue(70);
    mockLogs([today()]);

    const result = await habitService.completeHabit(userId, habitId);

    expect(incrementPointsMock).toHaveBeenCalledWith(userId, 20);
    expect(result).toEqual({ points: 20, streak: 1, totalPoints: 70 });
  });

  it("leder kun efter vanen blandt brugerens egne", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    incrementPointsMock.mockResolvedValue(20);
    mockLogs([today()]);

    await habitService.completeHabit(userId, habitId);

    expect(habitModel.findOne).toHaveBeenCalledWith({ _id: habitId, userId });
  });

  it("kaster HabitNotFoundError og gør intet, hvis vanen ikke findes eller tilhører en anden", async () => {
    habitModel.findOne.mockResolvedValue(null);

    await expect(habitService.completeHabit(userId, habitId)).rejects.toThrow(HabitNotFoundError);

    expect(habitLogModel.create).not.toHaveBeenCalled();
    expect(incrementPointsMock).not.toHaveBeenCalled();
  });

  it("kaster HabitAlreadyCompletedError og giver ingen point, hvis loggen allerede findes", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    // Det unikke indeks (habitId + completedAt) giver duplicate key-fejl 11000
    habitLogModel.create.mockRejectedValue({ code: 11000 });

    await expect(habitService.completeHabit(userId, habitId)).rejects.toThrow(HabitAlreadyCompletedError);

    expect(incrementPointsMock).not.toHaveBeenCalled();
  });

  it("sender andre databasefejl videre uændret", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    const dbError = new Error("forbindelsen røg");
    habitLogModel.create.mockRejectedValue(dbError);

    await expect(habitService.completeHabit(userId, habitId)).rejects.toBe(dbError);

    expect(incrementPointsMock).not.toHaveBeenCalled();
  });
});
