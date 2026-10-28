import { pointsFor } from "../../src/services/pointsService";

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