import request from "supertest";
import app from "../../src/app";

describe("app", () => {
  it("GET /health svarer 200 og status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("ukendt rute svarer 404", async () => {
    const res = await request(app).get("/findes-ikke");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Ruten findes ikke" });
  });
});