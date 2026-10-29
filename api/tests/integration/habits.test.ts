import request from "supertest";
import { Error as MongooseError, Types } from "mongoose";
import app from "../../src/app";
import * as habitService from "../../src/services/habitService";
import { signToken } from "../../src/lib/jwt";
import { HabitNotFoundError } from "../../src/errors/habitErrors";

// Servicen mockes, så testene kun handler om HTTP-laget: auth, validering og statuskoder
jest.mock("../../src/services/habitService");
const service = habitService as jest.Mocked<typeof habitService>;

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
