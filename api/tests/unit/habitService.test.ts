import { Types } from "mongoose";
import * as habitService from "../../src/services/habitService";
import { HabitModel } from "../../src/models/habits";
import { HabitLogModel } from "../../src/models/habitLogs";
import { HabitNotFoundError } from "../../src/errors/habitErrors";

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
  },
}));

// Fortæller TypeScript, at metoderne nu er mocks, så vi kan bruge fx mockResolvedValue
const habitModel = HabitModel as unknown as Record<"find" | "create" | "findOne" | "deleteOne", jest.Mock>;
const habitLogModel = HabitLogModel as unknown as Record<"deleteMany", jest.Mock>;

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
