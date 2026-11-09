import { pointsFor, incrementPoints, decrementPoints } from "../../src/services/pointsService";
import { UserModel } from "../../src/models/user";
import { AppError } from "../../src/errors/appError";

describe("pointsFor", () => {
  it("giver 10 point for let", () => {
    expect(pointsFor("let")).toBe(10);
  });

  it("giver 20 point for middel", () => {
    expect(pointsFor("middel")).toBe(20);
  });

  it("giver 30 point for svær", () => {
    expect(pointsFor("svær")).toBe(30);
  });
});

describe("incrementPoints", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // findOneAndUpdate(...).lean() er en kæde, så mocken returnerer et objekt med lean
  function mockUpdate(result: unknown) {
    const lean = jest.fn().mockResolvedValue(result);
    return jest.spyOn(UserModel, "findOneAndUpdate").mockReturnValue({ lean } as never);
  }

  it("lægger point til med $inc på den rigtige bruger", async () => {
    const update = mockUpdate({ totalPoints: 50 });

    await incrementPoints("665f1f77bcf86cd799439011", 20);

    expect(update).toHaveBeenCalledWith(
      { _id: "665f1f77bcf86cd799439011" },
      { $inc: { totalPoints: 20 } },
      expect.objectContaining({ returnDocument: "after" }),
    );
  });

  it("returnerer brugerens nye totalPoints", async () => {
    mockUpdate({ totalPoints: 50 });

    await expect(incrementPoints("665f1f77bcf86cd799439011", 20)).resolves.toBe(50);
  });

  it("kaster 404, hvis brugeren ikke findes", async () => {
    mockUpdate(null);

    await expect(incrementPoints("665f1f77bcf86cd799439011", 10)).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each([0, -5, 1.5, NaN])("afviser ugyldigt beløb %p uden at røre databasen", async (amount) => {
    const update = jest.spyOn(UserModel, "findOneAndUpdate");

    // Almindelig Error (500), ikke en AppError, da et ugyldigt beløb er en kodefejl
    const result = incrementPoints("665f1f77bcf86cd799439011", amount);
    await expect(result).rejects.toThrow("amount skal være et positivt heltal");
    await expect(result).rejects.not.toBeInstanceOf(AppError);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("decrementPoints", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockUpdate(result: unknown) {
    const lean = jest.fn().mockResolvedValue(result);
    return jest.spyOn(UserModel, "findOneAndUpdate").mockReturnValue({ lean } as never);
  }

  it("trækker point fra og lader totalen stoppe ved 0", async () => {
    const update = mockUpdate({ totalPoints: 30 });

    const total = await decrementPoints("665f1f77bcf86cd799439011", 20);

    expect(total).toBe(30);
    expect(update).toHaveBeenCalledWith(
      { _id: "665f1f77bcf86cd799439011" },
      [{ $set: { totalPoints: { $max: [0, { $subtract: ["$totalPoints", 20] }] } } }],
      expect.objectContaining({ returnDocument: "after", updatePipeline: true }),
    );
  });

  it("kaster 404, hvis brugeren ikke findes", async () => {
    mockUpdate(null);

    await expect(decrementPoints("665f1f77bcf86cd799439011", 10)).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each([0, -5, 1.5, NaN])("afviser ugyldigt beløb %p uden at røre databasen", async (amount) => {
    const update = jest.spyOn(UserModel, "findOneAndUpdate");

    await expect(decrementPoints("665f1f77bcf86cd799439011", amount)).rejects.toThrow(
      "amount skal være et positivt heltal",
    );
    expect(update).not.toHaveBeenCalled();
  });
});
