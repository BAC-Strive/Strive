import { parseOrThrow } from "../../src/validation/auth";
import { updateProfileSchema } from "../../src/validation/user";

describe("updateProfileSchema", () => {
  it("godkender kun fornavn og fjerner mellemrum", () => {
    expect(parseOrThrow(updateProfileSchema, { username: "  Test  "})).toEqual({ username: "Test" });
  });

  it("godkender kun email og gør den til små bogstaver", () => {
    expect(parseOrThrow(updateProfileSchema, { email: "Test@Test.com" })).toEqual({ email: "test@test.com" });
  });

  it("godkender både fornavn og email", () => {
    const result = parseOrThrow(updateProfileSchema, { username: "Test", email: "Test@Test.com" });
    expect(result).toEqual({ username: "Test", email: "test@test.com" });
  });

  it("afviser en tom opdatering", () => {
    expect(() => parseOrThrow(updateProfileSchema, {})).toThrow("Angiv fornavn eller email");
  });

  it("afviser fornavn, der kun består af mellemrum", () => {
    expect(() => parseOrThrow(updateProfileSchema, { username: "   " })).toThrow("Fornavn skal udfyldes");
  });

  it("afviser ugyldig email", () => {
    expect(() => parseOrThrow(updateProfileSchema, { email: "ikke-en-email" })).toThrow("Ugyldig email");
  });

  // Beskytter mod, at en bruger kan ændre felter som points via profilen (mass assignment)
  it("fjerner felter, der ikke må ændres", () => {
    const result = parseOrThrow(updateProfileSchema, {
      username: "Test",
      totalPoints: 9999,
      passwordHash: "hacket",
    });

    expect(result).toEqual({ username: "Test" });
  });
});
