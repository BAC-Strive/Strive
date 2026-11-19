import { Types } from "mongoose";
import * as rewardService from "../../src/services/rewardService";
import { HabitModel } from "../../src/models/habits";
import { HabitLogModel } from "../../src/models/habitLogs";
import {
  HabitNotFoundError,
  HabitAlreadyCompletedError,
  HabitAlreadyProtectedError,
  HabitNotProtectedError,
  HabitNotScheduledError,
  NoStreakToProtectError,
  NotEnoughPointsError,
} from "../../src/errors/habitErrors";
import { incrementPoints, spendPoints } from "../../src/services/pointsService";

// incrementPoints og spendPoints mockes, så testene ikke rører brugermodellen. protectionCostFor er uændret.
jest.mock("../../src/services/pointsService", () => ({
  ...jest.requireActual("../../src/services/pointsService"),
  incrementPoints: jest.fn(),
  spendPoints: jest.fn(),
}));
const incrementPointsMock = incrementPoints as jest.Mock;
const spendPointsMock = spendPoints as jest.Mock;

jest.mock("../../src/models/habits", () => ({
  ...jest.requireActual("../../src/models/habits"),
  HabitModel: { findOne: jest.fn() },
}));

jest.mock("../../src/models/habitLogs", () => ({
  ...jest.requireActual("../../src/models/habitLogs"),
  HabitLogModel: {
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

const habitModel = HabitModel as unknown as Record<"findOne", jest.Mock>;
const habitLogModel = HabitLogModel as unknown as Record<
  "find" | "create" | "deleteOne" | "findOneAndDelete",
  jest.Mock
>;

const userId = new Types.ObjectId().toString();
const habitId = new Types.ObjectId().toString();

// Fast tidspunkt (fredag 16. okt. 2026 kl. 12), så testene ikke afhænger af, hvornår de køres
const FIXED_NOW = new Date(2026, 9, 16, 12, 0);
const day = (date: number) => new Date(2026, 9, date);
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const NOT_TODAY = EVERY_DAY.filter((d) => d !== FIXED_NOW.getDay());

// "middel" koster 3 × 20 = 60 point
const habit = { _id: habitId, userId, name: "Løb en tur", weekdays: EVERY_DAY, difficulty: "middel" as const };

// find(...).select(...).lean() er en kæde, så mocken skal returnere objekter med select og lean
function mockLogs(logs: { completedAt: Date; isProtected?: boolean }[]) {
  const lean = jest.fn().mockResolvedValue(logs);
  habitLogModel.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean }) });
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers({ now: FIXED_NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("protectionStatus", () => {
  const base = { weekdays: EVERY_DAY, difficulty: "svær" as const, today: FIXED_NOW };

  it("er tilgængelig, når der er en streak, og dagen er planlagt og fri", () => {
    const status = rewardService.protectionStatus({ ...base, completedDates: [day(15)], protectedDates: [] });

    expect(status).toEqual({ available: true, cost: 90, reason: null, streak: 1 });
  });

  it("giver grunden i en fast rækkefølge: ikke planlagt, gennemført, beskyttet, ingen streak", () => {
    const notScheduled = rewardService.protectionStatus({
      ...base,
      weekdays: NOT_TODAY,
      completedDates: [day(16)],
      protectedDates: [],
    });
    const completed = rewardService.protectionStatus({ ...base, completedDates: [day(16)], protectedDates: [] });
    const protectedAlready = rewardService.protectionStatus({
      ...base,
      completedDates: [day(15)],
      protectedDates: [day(16)],
    });
    const noStreak = rewardService.protectionStatus({ ...base, completedDates: [], protectedDates: [] });

    expect([notScheduled, completed, protectedAlready, noStreak].map((s) => s.reason)).toEqual([
      "not-scheduled",
      "completed",
      "protected",
      "no-streak",
    ]);
  });
});

describe("protectStreak", () => {
  it("opretter et skjold for i dag, trækker prisen og returnerer pointsSpent og totalPoints", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    mockLogs([{ completedAt: day(15) }]);
    habitLogModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    spendPointsMock.mockResolvedValue(40);

    const result = await rewardService.protectStreak(userId, habitId);

    expect(habitLogModel.create).toHaveBeenCalledWith({
      habitId,
      completedAt: day(16),
      pointsAwarded: 0,
      isProtected: true,
      pointsSpent: 60,
    });
    expect(spendPointsMock).toHaveBeenCalledWith(userId, 60);
    expect(result).toEqual({ pointsSpent: 60, totalPoints: 40 });
  });

  it("kan beskytte, når streaken kun består, fordi i går var beskyttet", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    mockLogs([{ completedAt: day(14) }, { completedAt: day(15), isProtected: true }]);
    habitLogModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    spendPointsMock.mockResolvedValue(0);

    await expect(rewardService.protectStreak(userId, habitId)).resolves.toMatchObject({ pointsSpent: 60 });
  });

  it("leder kun efter vanen blandt brugerens egne og kaster 404, hvis den ikke findes", async () => {
    habitModel.findOne.mockResolvedValue(null);

    await expect(rewardService.protectStreak(userId, habitId)).rejects.toThrow(HabitNotFoundError);

    expect(habitModel.findOne).toHaveBeenCalledWith({ _id: habitId, userId });
    expect(habitLogModel.create).not.toHaveBeenCalled();
    expect(spendPointsMock).not.toHaveBeenCalled();
  });

  it.each([
    ["ikke er planlagt i dag", { ...habit, weekdays: NOT_TODAY }, [{ completedAt: day(15) }], HabitNotScheduledError],
    ["allerede er gennemført i dag", habit, [{ completedAt: day(16) }], HabitAlreadyCompletedError],
    [
      "allerede er beskyttet i dag",
      habit,
      [{ completedAt: day(15) }, { completedAt: day(16), isProtected: true }],
      HabitAlreadyProtectedError,
    ],
    ["der ingen streak er", habit, [], NoStreakToProtectError],
  ])("kaster en fejl og tager ingen point, hvis vanen %s", async (_navn, foundHabit, logs, ErrorClass) => {
    habitModel.findOne.mockResolvedValue(foundHabit);
    mockLogs(logs);

    await expect(rewardService.protectStreak(userId, habitId)).rejects.toThrow(ErrorClass);

    expect(habitLogModel.create).not.toHaveBeenCalled();
    expect(spendPointsMock).not.toHaveBeenCalled();
  });

  it("kaster HabitAlreadyProtectedError, hvis to kald kommer samtidig (duplicate key)", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    mockLogs([{ completedAt: day(15) }]);
    habitLogModel.create.mockRejectedValue({ code: 11000 });

    await expect(rewardService.protectStreak(userId, habitId)).rejects.toThrow(HabitAlreadyProtectedError);

    expect(spendPointsMock).not.toHaveBeenCalled();
  });

  it("sletter skjoldet igen og sender fejlen videre, hvis brugeren ikke har point nok", async () => {
    const logId = new Types.ObjectId();
    habitModel.findOne.mockResolvedValue(habit);
    mockLogs([{ completedAt: day(15) }]);
    habitLogModel.create.mockResolvedValue({ _id: logId });
    spendPointsMock.mockRejectedValue(new NotEnoughPointsError());

    await expect(rewardService.protectStreak(userId, habitId)).rejects.toThrow(NotEnoughPointsError);

    // Ellers ville der ligge et gratis skjold
    expect(habitLogModel.deleteOne).toHaveBeenCalledWith({ _id: logId });
  });
});

describe("unprotectStreak", () => {
  const shield = { _id: new Types.ObjectId(), habitId, completedAt: day(16), isProtected: true, pointsSpent: 60 };

  it("sletter dagens skjold og giver de point tilbage, det kostede", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(shield);
    incrementPointsMock.mockResolvedValue(100);

    const result = await rewardService.unprotectStreak(userId, habitId);

    expect(habitLogModel.findOneAndDelete).toHaveBeenCalledWith({
      habitId,
      completedAt: day(16),
      isProtected: true, // en gennemførsel må ikke slettes her
    });
    expect(incrementPointsMock).toHaveBeenCalledWith(userId, 60);
    expect(result).toEqual({ pointsRefunded: 60, totalPoints: 100 });
  });

  it("kaster 404, hvis vanen ikke findes eller tilhører en anden", async () => {
    habitModel.findOne.mockResolvedValue(null);

    await expect(rewardService.unprotectStreak(userId, habitId)).rejects.toThrow(HabitNotFoundError);

    expect(habitModel.findOne).toHaveBeenCalledWith({ _id: habitId, userId });
    expect(habitLogModel.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("kaster HabitNotProtectedError og refunderer intet, hvis der ikke er et skjold i dag", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(null);

    await expect(rewardService.unprotectStreak(userId, habitId)).rejects.toThrow(HabitNotProtectedError);

    expect(incrementPointsMock).not.toHaveBeenCalled();
  });

  it("lægger skjoldet tilbage og sender fejlen videre, hvis refunderingen fejler", async () => {
    habitModel.findOne.mockResolvedValue(habit);
    habitLogModel.findOneAndDelete.mockResolvedValue(shield);
    const pointsError = new Error("Brugeren findes ikke");
    incrementPointsMock.mockRejectedValue(pointsError);

    await expect(rewardService.unprotectStreak(userId, habitId)).rejects.toBe(pointsError);

    expect(habitLogModel.create).toHaveBeenCalledWith({
      habitId,
      completedAt: day(16),
      pointsAwarded: 0,
      isProtected: true,
      pointsSpent: 60,
    });
  });
});
