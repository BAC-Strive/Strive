import { Types } from "mongoose";
import * as userService from "../../src/services/userService";
import { UserModel } from "../../src/models/user";
import { EmailTakenError, UnauthorizedError } from "../../src/errors/authErrors";

// Erstatter databasedelen af User-modellen med mocks. toPublicUser er uændret.
jest.mock("../../src/models/user", () => ({
  ...jest.requireActual("../../src/models/user"),
  UserModel: {
    exists: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const userModel = UserModel as unknown as Record<"exists" | "findByIdAndUpdate", jest.Mock>;

const userId = new Types.ObjectId().toString();

// En falsk bruger, som "databasen" returnerer. passwordHash er med for at tjekke, at den ikke lækker.
// Man kan teste forskellige scenarier ved at ændre username og email i changes-objektet.
function fakeUser(changes: { username?: string; email?: string } = {}) {
  return {
    _id: new Types.ObjectId(userId),
    username: "Test",
    email: "test@test.com",
    totalPoints: 40,
    passwordHash: "hemmelig-hash",
    ...changes,
  };
}

// Resetter alle mocks før hver test, så de ikke påvirker hinanden.
beforeEach(() => {
  jest.resetAllMocks();
});

describe("updateProfile", () => {
  it("opdaterer fornavnet og returnerer kun de offentlige felter", async () => {
    userModel.findByIdAndUpdate.mockResolvedValue(fakeUser({ username: "Test 1" }));

    const result = await userService.updateProfile(userId, { username: "Test 1" });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      { username: "Test 1" },
      expect.objectContaining({ new: true, runValidators: true }),
    );
    // toEqual kræver præcis disse felter, så testen fejler, hvis passwordHash kommer med
    expect(result).toEqual({ id: userId, username: "Test 1", email: "test@test.com", totalPoints: 40 });
  });

  it("tjekker ikke email, når kun fornavnet ændres", async () => {
    userModel.findByIdAndUpdate.mockResolvedValue(fakeUser());

    await userService.updateProfile(userId, { username: "Test" });

    expect(userModel.exists).not.toHaveBeenCalled();
  });

  it("leder kun efter emailen hos andre brugere end den indloggede", async () => {
    userModel.exists.mockResolvedValue(null);
    userModel.findByIdAndUpdate.mockResolvedValue(fakeUser({ email: "ny@test.dk" }));

    await userService.updateProfile(userId, { email: "ny@test.dk" });

    expect(userModel.exists).toHaveBeenCalledWith({ email: "ny@test.dk", _id: { $ne: userId } });
  });

  it("kaster EmailTakenError og opdaterer intet, hvis emailen bruges af en anden", async () => {
    userModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(userService.updateProfile(userId, { email: "optaget@test.dk" })).rejects.toThrow(
      EmailTakenError,
    );
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("kaster EmailTakenError, hvis databasen melder dublet ved samtidige ændringer", async () => {
    userModel.exists.mockResolvedValue(null);
    userModel.findByIdAndUpdate.mockRejectedValue({ code: 11000, keyPattern: { email: 1 } });

    await expect(userService.updateProfile(userId, { email: "ny@test.dk" })).rejects.toThrow(
      EmailTakenError,
    );
  });

  it("sender en dublet på et andet felt videre uændret", async () => {
    const otherDuplicate = { code: 11000, keyPattern: { username: 1 } };
    userModel.findByIdAndUpdate.mockRejectedValue(otherDuplicate);

    await expect(userService.updateProfile(userId, { username: "Test" })).rejects.toBe(otherDuplicate);
  });

  it("kaster UnauthorizedError, hvis brugeren ikke længere findes", async () => {
    userModel.findByIdAndUpdate.mockResolvedValue(null);

    await expect(userService.updateProfile(userId, { username: "Test" })).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
