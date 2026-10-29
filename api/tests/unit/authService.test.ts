import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import * as authService from "../../src/services/authService";
import { UserModel } from "../../src/models/user";
import { verifyToken } from "../../src/lib/jwt";
import { EmailTakenError, InvalidCredentialsError, UnauthorizedError } from "../../src/errors/authErrors";

// Erstatter databasedelen af User-modellen med mocks. Resten af filen, fx toPublicUser, er uændret.
jest.mock("../../src/models/user", () => ({
  ...jest.requireActual("../../src/models/user"),
  UserModel: {
    exists: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

// Fortæller TypeScript, at metoderne nu er mocks, så vi kan bruge fx mockResolvedValue
const userModel = UserModel as unknown as Record<"exists" | "create" | "findOne" | "findById", jest.Mock>;

// En falsk bruger, som "databasen" returnerer i testene
function fakeUser(passwordMatches = true) {
  return {
    _id: new Types.ObjectId(),
    username: "TestUser",
    email: "test@user.com",
    totalPoints: 0,
    comparePassword: jest.fn().mockResolvedValue(passwordMatches),
  };
}

// findOne(...).select(...) er en kæde, så mocken skal returnere et objekt med select
function mockFindOne(result: unknown) {
  const select = jest.fn().mockResolvedValue(result);
  userModel.findOne.mockReturnValue({ select });
  return select;
}

const input = { username: "TestUser", email: "test@user.com", password: "TestPassword123" };

// Nulstiller alle mocks, så testene ikke påvirker hinanden
beforeEach(() => {
  jest.resetAllMocks();
});

describe("register", () => {
  it("opretter brugeren og returnerer token og offentlige data", async () => {
    const user = fakeUser();
    userModel.exists.mockResolvedValue(null);
    userModel.create.mockResolvedValue(user);

    const result = await authService.register(input);

    expect(verifyToken(result.token)).toBe(user._id.toString());
    expect(result.user).toEqual({
      id: user._id.toString(),
      username: "TestUser",
      email: "test@user.com",
      totalPoints: 0,
    });
  });

  it("gemmer en bcrypt-hash i stedet for adgangskoden (FURPS R1)", async () => {
    userModel.exists.mockResolvedValue(null);
    userModel.create.mockResolvedValue(fakeUser());

    await authService.register(input);

    // Henter det objekt, servicen forsøgte at gemme i databasen
    const { passwordHash } = userModel.create.mock.calls[0][0];
    expect(passwordHash).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, passwordHash)).toBe(true);
  });

  it("kaster EmailTakenError, hvis emailen allerede findes", async () => {
    userModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(authService.register(input)).rejects.toThrow(EmailTakenError);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it("kaster EmailTakenError, hvis databasen melder dublet ved samtidige oprettelser", async () => {
    userModel.exists.mockResolvedValue(null);
    userModel.create.mockRejectedValue({ code: 11000, keyPattern: { email: 1 } });

    await expect(authService.register(input)).rejects.toThrow(EmailTakenError);
  });

  it("sender andre databasefejl videre uændret", async () => {
    userModel.exists.mockResolvedValue(null);
    userModel.create.mockRejectedValue(new Error("Databasen er nede"));

    await expect(authService.register(input)).rejects.toThrow("Databasen er nede");
  });
});

describe("login", () => {
  it("logger ind med korrekt adgangskode", async () => {
    const user = fakeUser();
    const select = mockFindOne(user);

    const result = await authService.login({ email: "test@user.com", password: "TestPassword123" });

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@user.com" });
    expect(select).toHaveBeenCalledWith("+passwordHash");
    expect(user.comparePassword).toHaveBeenCalledWith("TestPassword123");
    expect(verifyToken(result.token)).toBe(user._id.toString());
  });

  it("kaster InvalidCredentialsError ved forkert adgangskode", async () => {
    mockFindOne(fakeUser(false));

    await expect(
      authService.login({ email: "test@user.com", password: "Forkert123" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("kaster samme fejl ved ukendt email (US2)", async () => {
    mockFindOne(null);

    await expect(
      authService.login({ email: "findes@ikke.dk", password: "TestPassword123" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

describe("getCurrentUser", () => {
  it("returnerer den offentlige bruger", async () => {
    const user = fakeUser();
    userModel.findById.mockResolvedValue(user);

    await expect(authService.getCurrentUser(user._id.toString())).resolves.toEqual({
      id: user._id.toString(),
      username: "TestUser",
      email: "test@user.com",
      totalPoints: 0,
    });
  });

  it("kaster UnauthorizedError, hvis brugeren ikke længere findes", async () => {
    userModel.findById.mockResolvedValue(null);

    await expect(authService.getCurrentUser(new Types.ObjectId().toString())).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
