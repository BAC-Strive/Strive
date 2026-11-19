import request from "supertest";
import { Error as MongooseError, Types } from "mongoose";
import app from "../../src/app";
import * as habitService from "../../src/services/habitService";
import * as rewardService from "../../src/services/rewardService";
import { signToken } from "../../src/lib/jwt";
import {
  HabitNotFoundError,
  HabitAlreadyCompletedError,
  HabitNotCompletedError,
  HabitNotScheduledError,
  HabitAlreadyProtectedError,
  HabitNotProtectedError,
  NoStreakToProtectError,
  NotEnoughPointsError,
  PointsAlreadySpentError,
} from "../../src/errors/habitErrors";

// Servicen mockes, så testene kun handler om HTTP-laget: auth, validering og statuskoder
jest.mock("../../src/services/habitService");
jest.mock("../../src/services/rewardService");
const service = habitService as jest.Mocked<typeof habitService>;
const rewards = rewardService as jest.Mocked<typeof rewardService>;

const userId = new Types.ObjectId().toString();
const habitId = new Types.ObjectId().toString();
// Rigtig token underskrevet med test-hemmeligheden fra setupEnv.ts
const auth = { Authorization: `Bearer ${signToken(userId)}` };
const validHabit = { name: "Løb en tur", weekdays: [1, 3], difficulty: "middel" };

beforeEach(() => {
  jest.resetAllMocks();
});

describe("auth på /habits", () => {
  it("svarer 401 uden token", async () => {
    const res = await request(app).get("/habits");

    expect(res.status).toBe(401);
    expect(service.getOverview).not.toHaveBeenCalled();
  });

  it("svarer 401 med ugyldig token", async () => {
    const res = await request(app).get("/habits").set("Authorization", "Bearer ugyldig");

    expect(res.status).toBe(401);
  });
});

describe("GET /habits", () => {
  it("svarer 200 med brugerens vaner", async () => {
    const habits = [{ _id: habitId, userId, ...validHabit }];
    service.getOverview.mockResolvedValue(habits as never);

    const res = await request(app).get("/habits").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(habits);
    // userId kommer fra tokenen, ikke fra klienten
    expect(service.getOverview).toHaveBeenCalledWith(userId);
  });
});

describe("POST /habits", () => {
  it("svarer 201 med den oprettede vane (US6)", async () => {
    const saved = { _id: habitId, userId, ...validHabit };
    service.createHabit.mockResolvedValue(saved as never);

    const res = await request(app).post("/habits").set(auth).send(validHabit);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(saved);
    expect(service.createHabit).toHaveBeenCalledWith(userId, validHabit);
  });

  it("sender det rensede input videre til servicen", async () => {
    service.createHabit.mockResolvedValue({} as never);

    await request(app)
      .post("/habits")
      .set(auth)
      .send({ ...validHabit, name: "  Løb en tur  ", weekdays: [3, 1, 1] });

    expect(service.createHabit).toHaveBeenCalledWith(userId, validHabit);
  });

  it("svarer 400 og opretter intet ved ugyldigt input", async () => {
    const res = await request(app).post("/habits").set(auth).send({ ...validHabit, weekdays: [] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Vælg mindst én dag" });
    expect(service.createHabit).not.toHaveBeenCalled();
  });

  it("svarer 400 ved ugyldig JSON", async () => {
    const res = await request(app)
      .post("/habits")
      .set(auth)
      .set("Content-Type", "application/json")
      .send('{"name":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Ugyldig JSON" });
  });
});

describe("DELETE /habits/:id", () => {
  it("svarer 204 uden indhold (US9)", async () => {
    service.deleteHabit.mockResolvedValue();

    const res = await request(app).delete(`/habits/${habitId}`).set(auth);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(service.deleteHabit).toHaveBeenCalledWith(userId, habitId);
  });

  it("svarer 404, hvis vanen ikke findes eller tilhører en anden", async () => {
    service.deleteHabit.mockRejectedValue(new HabitNotFoundError());

    const res = await request(app).delete(`/habits/${habitId}`).set(auth);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Vanen findes ikke" });
  });

  it("svarer 400 ved ugyldigt id", async () => {
    // Det er den fejl, Mongoose kaster, når "abc" ikke kan laves om til et ObjectId
    service.deleteHabit.mockRejectedValue(new MongooseError.CastError("ObjectId", "abc", "_id"));

    const res = await request(app).delete("/habits/abc").set(auth);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Ugyldigt id" });
  });
});

describe("POST /habits/:id/complete", () => {
  it("svarer 201 med pointsAwarded, pointsRefunded, streak og totalPoints", async () => {
    const result = { pointsAwarded: 20, pointsRefunded: 0, streak: 3, totalPoints: 70 };
    service.completeHabit.mockResolvedValue(result);

    const res = await request(app).post(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(result);
    // userId kommer fra tokenen, ikke fra klienten
    expect(service.completeHabit).toHaveBeenCalledWith(userId, habitId);
  });

  it("svarer 404, hvis vanen ikke findes eller tilhører en anden", async () => {
    service.completeHabit.mockRejectedValue(new HabitNotFoundError());

    const res = await request(app).post(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Vanen findes ikke" });
  });

  it("svarer 409, hvis vanen allerede er gennemført i dag", async () => {
    service.completeHabit.mockRejectedValue(new HabitAlreadyCompletedError());

    const res = await request(app).post(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Vanen er allerede gennemført i dag" });
  });

  it("svarer 401 uden token", async () => {
    const res = await request(app).post(`/habits/${habitId}/complete`);

    expect(res.status).toBe(401);
    expect(service.completeHabit).not.toHaveBeenCalled();
  });
});

describe("POST /habits/:id/complete, ugyldigt id", () => {
  it("svarer 400 ved ugyldigt id", async () => {
    // Det er den fejl, Mongoose kaster, når "abc" ikke kan laves om til et ObjectId
    service.completeHabit.mockRejectedValue(new MongooseError.CastError("ObjectId", "abc", "_id"));

    const res = await request(app).post("/habits/abc/complete").set(auth);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Ugyldigt id" });
  });
});

describe("DELETE /habits/:id/complete", () => {
  it("svarer 200 med pointsRemoved, streak og totalPoints (US8)", async () => {
    const result = { pointsRemoved: 20, streak: 2, totalPoints: 50 };
    service.undoCompleteHabit.mockResolvedValue(result);

    const res = await request(app).delete(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(service.undoCompleteHabit).toHaveBeenCalledWith(userId, habitId);
  });

  it("svarer 404, hvis vanen ikke findes eller tilhører en anden", async () => {
    service.undoCompleteHabit.mockRejectedValue(new HabitNotFoundError());

    const res = await request(app).delete(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Vanen findes ikke" });
  });

  it("svarer 409, hvis vanen ikke er gennemført i dag", async () => {
    service.undoCompleteHabit.mockRejectedValue(new HabitNotCompletedError());

    const res = await request(app).delete(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Vanen er ikke gennemført i dag" });
  });

  it("svarer 401 uden token", async () => {
    const res = await request(app).delete(`/habits/${habitId}/complete`);

    expect(res.status).toBe(401);
    expect(service.undoCompleteHabit).not.toHaveBeenCalled();
  });
});

describe("POST /habits/:id/complete, ikke planlagt i dag", () => {
  it("svarer 400, hvis vanen ikke skal gennemføres i dag", async () => {
    service.completeHabit.mockRejectedValue(new HabitNotScheduledError());

    const res = await request(app).post(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Vanen skal ikke gennemføres i dag" });
  });
});

describe("POST /habits/:id/protect", () => {
  it("svarer 201 med pointsSpent og totalPoints", async () => {
    const result = { pointsSpent: 60, totalPoints: 40 };
    rewards.protectStreak.mockResolvedValue(result);

    const res = await request(app).post(`/habits/${habitId}/protect`).set(auth);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(result);
    // userId kommer fra tokenen, ikke fra klienten
    expect(rewards.protectStreak).toHaveBeenCalledWith(userId, habitId);
  });

  it.each([
    ["404", new HabitNotFoundError(), 404, "Vanen findes ikke"],
    ["400 hvis vanen ikke er planlagt i dag", new HabitNotScheduledError(), 400, "Vanen skal ikke gennemføres i dag"],
    ["409 hvis dagen allerede er gennemført", new HabitAlreadyCompletedError(), 409, "Vanen er allerede gennemført i dag"],
    ["409 hvis dagen allerede er beskyttet", new HabitAlreadyProtectedError(), 409, "Vanen er allerede beskyttet i dag"],
    ["409 hvis der ingen streak er", new NoStreakToProtectError(), 409, "Der er ingen streak at beskytte"],
    ["409 hvis der ikke er point nok", new NotEnoughPointsError(), 409, "Du har ikke nok point"],
  ])("svarer %s", async (_navn, error, status, message) => {
    rewards.protectStreak.mockRejectedValue(error);

    const res = await request(app).post(`/habits/${habitId}/protect`).set(auth);

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ message });
  });

  it("svarer 400 ved ugyldigt id", async () => {
    rewards.protectStreak.mockRejectedValue(new MongooseError.CastError("ObjectId", "abc", "_id"));

    const res = await request(app).post("/habits/abc/protect").set(auth);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Ugyldigt id" });
  });

  it("svarer 401 uden token", async () => {
    const res = await request(app).post(`/habits/${habitId}/protect`);

    expect(res.status).toBe(401);
    expect(rewards.protectStreak).not.toHaveBeenCalled();
  });
});

describe("DELETE /habits/:id/protect", () => {
  it("svarer 200 med pointsRefunded og totalPoints", async () => {
    const result = { pointsRefunded: 60, totalPoints: 100 };
    rewards.unprotectStreak.mockResolvedValue(result);

    const res = await request(app).delete(`/habits/${habitId}/protect`).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(rewards.unprotectStreak).toHaveBeenCalledWith(userId, habitId);
  });

  it("svarer 404, hvis vanen ikke findes eller tilhører en anden", async () => {
    rewards.unprotectStreak.mockRejectedValue(new HabitNotFoundError());

    const res = await request(app).delete(`/habits/${habitId}/protect`).set(auth);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Vanen findes ikke" });
  });

  it("svarer 409, hvis vanen ikke er beskyttet i dag", async () => {
    rewards.unprotectStreak.mockRejectedValue(new HabitNotProtectedError());

    const res = await request(app).delete(`/habits/${habitId}/protect`).set(auth);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Vanen er ikke beskyttet i dag" });
  });

  it("svarer 401 uden token", async () => {
    const res = await request(app).delete(`/habits/${habitId}/protect`);

    expect(res.status).toBe(401);
    expect(rewards.unprotectStreak).not.toHaveBeenCalled();
  });
});

describe("DELETE /habits/:id/complete, pointene er brugt", () => {
  it("svarer 409, hvis brugeren har brugt de point, gennemførslen gav", async () => {
    service.undoCompleteHabit.mockRejectedValue(new PointsAlreadySpentError());

    const res = await request(app).delete(`/habits/${habitId}/complete`).set(auth);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      message: "Du har brugt pointene fra gennemførslen og kan derfor ikke fortryde den",
    });
  });
});
