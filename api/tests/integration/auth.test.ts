import request from "supertest";
import app from "../../src/app";
import { UserModel } from "../../src/models/user";
import { connectTestDb, clearTestDb, closeTestDb } from "../helpers/db";

beforeAll(async () => {
  await connectTestDb();
  await UserModel.init(); // sikrer at det unikke index på email-feltet er oprettet, før vi kører tests
});

afterEach(clearTestDb);
afterAll(closeTestDb);

const testUser = { username: "TestUser", email: "Test@user.com", password: "TestPassword123" };

describe("POST /auth/register", () => {
  it("opretter bruger og returnerer token og offentlig brugerdata", async () => {
    const res = await request(app).post("/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String)); // forventer en token som en streng
    // toEqual kræver præcist disse felter, så testene fejler,
    // hvis passwordHash eller andre felter returneres.
    // Dette sikrer, at vi ikke utilsigtet returnerer følsomme data.
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username: "TestUser",
      email: "test@user.com",
      totalPoints: 0,
    });
  });

  it("gemmer adgangskoden hashet, aldrig i klartekst (FURPS R1)", async () => {
    await request(app).post("/auth/register").send(testUser);

    const user = await UserModel.findOne({ email: "test@user.com" }).select("+passwordHash");
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(testUser.password); // adgangskoden skal være hashet, ikke i klartekst
  });

  it("afviser optaget email med 409, uanset store og små bogstaver", async () => {
    await request(app).post("/auth/register").send(testUser);
    const res = await request(app)
      .post("/auth/register")
      .send({ ...testUser, email: "TEST@USER.COM" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email er allerede i brug");
  });

  it("afviser for kort adgangskode med 400", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...testUser, password: "kort" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Adgangskoden skal være mindst 8 tegn");
  });

  it("afviser manglende fornavn med 400", async () => {
    const { username, ...udenNavn } = testUser;
    const res = await request(app).post("/auth/register").send(udenNavn);

    expect(res.status).toBe(400);
  });
});
