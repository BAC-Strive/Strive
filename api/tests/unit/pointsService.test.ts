import { pointsFor, incrementPoints } from "../../src/services/pointsService";
import { UserModel } from "../../src/models/user";

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

  it("lægger point til med $inc på den rigtige bruger", async () => {
    const updateOne = jest
      .spyOn(UserModel, "updateOne")
      .mockResolvedValue({ matchedCount: 1 } as never);

    await incrementPoints("665f1f77bcf86cd799439011", 20);

    expect(updateOne).toHaveBeenCalledWith(
      { _id: "665f1f77bcf86cd799439011" },
      { $inc: { totalPoints: 20 } },
    );
  });

  it("kaster 404, hvis brugeren ikke findes", async () => {
    jest.spyOn(UserModel, "updateOne").mockResolvedValue({ matchedCount: 0 } as never);

    await expect(incrementPoints("665f1f77bcf86cd799439011", 10)).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each([0, -5, 1.5, NaN])("afviser ugyldigt beløb %p uden at røre databasen", async (amount) => {
    const updateOne = jest.spyOn(UserModel, "updateOne");

    await expect(incrementPoints("665f1f77bcf86cd799439011", amount)).rejects.toMatchObject({
      status: 400,
    });
    expect(updateOne).not.toHaveBeenCalled();
  });
});
