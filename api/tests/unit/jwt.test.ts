import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../../src/lib/jwt";
import { env } from "../../src/config/env";

describe("signToken og verifyToken", () => {
  it("giver det samme userId tilbage, som tokenen blev lavet med", () => {
    const token = signToken("bruger-123");
    expect(verifyToken(token)).toBe("bruger-123");
  });

  it("afviser en token, der er ændret", () => {
    const token = signToken("bruger-123");
    // Ændrer sidste tegn, så underskriften ikke længere passer
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");

    expect(() => verifyToken(tampered)).toThrow();
  });

  // Nedenstående tokens laves direkte med jsonwebtoken for at efterligne en angriber

  it("afviser en token underskrevet med en anden hemmelighed", () => {
    const token = jwt.sign({}, "en-anden-hemmelighed", { subject: "bruger-123" });
    expect(() => verifyToken(token)).toThrow();
  });

  it("afviser en udløbet token", () => {
    const etMinutSiden = Math.floor(Date.now() / 1000) - 60;
    const token = jwt.sign({ exp: etMinutSiden }, env.JWT_SECRET, { subject: "bruger-123" });

    expect(() => verifyToken(token)).toThrow();
  });

  it("afviser en token med en anden algoritme end HS256", () => {
    const token = jwt.sign({}, env.JWT_SECRET, { subject: "bruger-123", algorithm: "HS512" });
    expect(() => verifyToken(token)).toThrow();
  });

  it("afviser en token uden userId", () => {
    const token = jwt.sign({}, env.JWT_SECRET);
    expect(() => verifyToken(token)).toThrow("Token mangler subject");
  });
});
