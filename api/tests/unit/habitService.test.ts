import { Types } from "mongoose";
import * as habitService from "../../src/services/habitService";
import { HabitModel } from "../../src/models/habits";
import { HabitLogModel } from "../../src/models/habitLogs";
import {
  HabitNotFoundError,
  HabitAlreadyCompletedError,
  HabitNotCompletedError,
  HabitNotScheduledError,
} from "../../src/errors/habitErrors";
import { incrementPoints, decrementPoints } from "../../src/services/pointsService";

// incrementPoints og decrementPoints mockes, så testene ikke rører brugermodellen. pointsFor er uændret.
jest.mock("../../src/services/pointsService", () => ({
  ...jest.requireActual("../../src/services/pointsService"),
  incrementPoints: jest.fn(),
  decrementPoints: jest.fn(),
}));
const incrementPointsMock = incrementPoints as jest.Mock;
const decrementPointsMock = decrementPoints as jest.Mock;

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
    deleteOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

// Fortæller TypeScript, at metoderne nu er mocks, så vi kan bruge fx mockResolvedValue
const habitModel = HabitModel as unknown as Record<"find" | "create" | "findOne" | "deleteOne", jest.Mock>;
const habitLogModel = HabitLogModel as unknown as Record<"deleteMany" | "deleteOne" | "create" | "find" | "findOneAndDelete", jest.Mock>;

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

// HabitLogModel.find(...).select(...).lean() er også en kæde
function mockLogFind(result: unknown) {
  const lean = jest.fn().mockResolvedValue(result);
  habitLogModel.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean }) });
}

// Nulstiller alle mocks, så testene ikke påvirker hinanden
beforeEach(() => {
  jest.resetAllMocks();
});

describe("getOverview", () => {
  it("henter kun brugerens egne vaner, nyeste først", async () => {
    const sort = mockFind([{ _id: habitId, userId, ...input }]);
    mockLogFind([]);

    await habitService.getOverview(userId);

    expect(habitModel.find).toHaveBeenCalledWith({ userId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it("henter logs for alle vanerne i ét kald", async () => {
    const otherId = new Types.ObjectId().toString();
    mockFind([{ _id: habitId, userId, ...input }, { _id: otherId, userId, ...input }]);
    mockLogFind([]);

    await habitService.getOverview(userId);

    expect(habitLogModel.find).toHaveBeenCalledTimes(1);
    expect(habitLogModel.find).toHaveBeenCalledWith({ habitId: { $in: [habitId, otherId] } });
  });

  it("lægger streak og completedToday på hver vane", async () => {
    const otherId = new Types.ObjectId().toString();
    const everyDay = [0, 1, 2, 3, 4, 5, 6];
    mockFind([
      { _id: habitId, userId, ...input, weekdays: everyDay },
      { _id: otherId, userId, ...input, weekdays: everyDay },
    ]);
    // Kun den første vane er gennemført i dag
    mockLogFind([{ habitId, completedAt: new Date() }]);

    const result = await habitService.getOverview(userId);

    expect(result[0]).toMatchObject({ _id: habitId, streak: 1, completedToday: true });
    expect(result[1]).toMatchObject({ _id: otherId, streak: 0, completedToday: false });
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

  it("lægger vanens point til brugeren og returnerer pointsAwarded, streak og totalPoints", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    incrementPointsMock.mockResolvedValue(70);
    mockLogs([today()]);

    const result = await habitService.completeHabit(userId, habitId);

    expect(incrementPointsMock).toHaveBeenCalledWith(userId, 20);
    expect(result).toEqual({ pointsAwarded: 20, streak: 1, totalPoints: 70 });
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

describe("completeHabit, hvis point ikke kan lægges til", () => {
  const habit = { _id: habitId, userId, name: "Løb en tur", weekdays: [0, 1, 2, 3, 4, 5, 6], difficulty: "let" };
  const logId = new Types.ObjectId();

  it("sletter loggen igen og sender fejlen videre, så brugeren kan prøve igen", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.create.mockResolvedValue({ _id: logId });
    const pointsError = new Error("Brugeren findes ikke");
    incrementPointsMock.mockRejectedValue(pointsError);

    await expect(habitService.completeHabit(userId, habitId)).rejects.toBe(pointsError);

    expect(habitLogModel.deleteOne).toHaveBeenCalledWith({ _id: logId });
    expect(habitLogModel.find).not.toHaveBeenCalled();
  });
});

describe("undoCompleteHabit", () => {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const habit = { _id: habitId, userId, name: "Løb en tur", weekdays: allDays, difficulty: "middel" };
  const logDate = new Date(2026, 9, 16);
  const log = { _id: new Types.ObjectId(), habitId, completedAt: logDate, pointsAwarded: 20 };

  // find(...).select(...).lean() er en kæde, så mocken skal returnere objekter med select og lean
  function mockLogs(dates: Date[]) {
    const lean = jest.fn().mockResolvedValue(dates.map((completedAt) => ({ completedAt })));
    const select = jest.fn().mockReturnValue({ lean });
    habitLogModel.find.mockReturnValue({ select });
  }

  it("sletter dagens log og trækker de point tilbage, den gav", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(log);
    decrementPointsMock.mockResolvedValue(50);
    mockLogs([]);

    const result = await habitService.undoCompleteHabit(userId, habitId);

    expect(habitLogModel.findOneAndDelete).toHaveBeenCalledWith({
      habitId,
      completedAt: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
    });
    expect(decrementPointsMock).toHaveBeenCalledWith(userId, 20);
    expect(result).toEqual({ pointsRemoved: 20, streak: 0, totalPoints: 50 });
  });

  it("regner streaken ud igen uden dagens log", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(log);
    decrementPointsMock.mockResolvedValue(30);
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    mockLogs([yesterday]);

    const result = await habitService.undoCompleteHabit(userId, habitId);

    expect(result.streak).toBe(1);
  });

  it("leder kun efter vanen blandt brugerens egne", async () => {
    habitModel.findOne.mockResolvedValue(null);

    await expect(habitService.undoCompleteHabit(userId, habitId)).rejects.toThrow(HabitNotFoundError);

    expect(habitModel.findOne).toHaveBeenCalledWith({ _id: habitId, userId });
    expect(habitLogModel.findOneAndDelete).not.toHaveBeenCalled();
    expect(decrementPointsMock).not.toHaveBeenCalled();
  });

  it("kaster HabitNotCompletedError og trækker ingen point, hvis vanen ikke er gennemført i dag", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(null);

    await expect(habitService.undoCompleteHabit(userId, habitId)).rejects.toThrow(HabitNotCompletedError);

    expect(decrementPointsMock).not.toHaveBeenCalled();
  });

  it("lægger loggen tilbage og sender fejlen videre, hvis point ikke kan trækkes fra", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(log);
    const pointsError = new Error("Brugeren findes ikke");
    decrementPointsMock.mockRejectedValue(pointsError);

    await expect(habitService.undoCompleteHabit(userId, habitId)).rejects.toBe(pointsError);

    expect(habitLogModel.create).toHaveBeenCalledWith({
      habitId,
      completedAt: logDate,
      pointsAwarded: 20,
    });
  });
});

describe("completeHabit, hvis vanen ikke er planlagt i dag", () => {
  // Alle ugedage undtagen i dag
  const notToday = [0, 1, 2, 3, 4, 5, 6].filter((day) => day !== new Date().getDay());
  const habit = { _id: habitId, userId, name: "Løb en tur", weekdays: notToday, difficulty: "let" };

  it("kaster HabitNotScheduledError og opretter ingen log og giver ingen point", async () => {
    habitModel.findOne.mockResolvedValue(habit);

    await expect(habitService.completeHabit(userId, habitId)).rejects.toThrow(HabitNotScheduledError);

    expect(habitLogModel.create).not.toHaveBeenCalled();
    expect(incrementPointsMock).not.toHaveBeenCalled();
  });
});
