import { createHabitSchema } from "../../src/validation/habit";
import { parseOrThrow } from "../../src/validation/auth";
import { ValidationError } from "../../src/errors/authErrors";

const validHabit = { name: "Løb en tur", weekdays: [1, 3], difficulty: "middel" };

describe("createHabitSchema", () => {
  it("godkender gyldigt input og trimmer navnet", () => {
    const result = parseOrThrow(createHabitSchema, { ...validHabit, name: "  Løb en tur  " });

    expect(result).toEqual({ name: "Løb en tur", weekdays: [1, 3], difficulty: "middel" });
  });

  it("fjerner dubletter i weekdays og sorterer dem", () => {
    const result = parseOrThrow(createHabitSchema, { ...validHabit, weekdays: [3, 1, 1, 0] });
    expect(result.weekdays).toEqual([0, 1, 3]);
  });

  it("godkender alle tre sværhedsgrader", () => {
    for (const difficulty of ["let", "middel", "svær"]) {
      expect(() => parseOrThrow(createHabitSchema, { ...validHabit, difficulty })).not.toThrow();
    }
  });

  // Mongoose ville lave 123 om til "123", så zod skal afvise det
  it("afviser navn, der ikke er tekst", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, name: 123 }))
      .toThrow("Navn skal være en tekst");
  });

  it("afviser navn, der kun består af mellemrum", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, name: "   " }))
      .toThrow("Navn skal udfyldes");
  });

  it("afviser navn over 50 tegn", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, name: "a".repeat(51) }))
      .toThrow("Navn må højst være 50 tegn");
  });

  it("afviser tom liste af dage", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, weekdays: [] }))
      .toThrow("Vælg mindst én dag");
  });

  it("afviser dage uden for 0-6", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, weekdays: [7] }))
      .toThrow("Dage skal være mellem 0 og 6");
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, weekdays: [-1] }))
      .toThrow("Dage skal være mellem 0 og 6");
  });

  it("afviser dage, der ikke er hele tal", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, weekdays: [1.5] }))
      .toThrow("Dage skal være hele tal");
  });

  it("afviser dage, der ikke er en liste", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, weekdays: 1 }))
      .toThrow("Dage skal være en liste af tal");
  });

  it("afviser ukendt sværhedsgrad", () => {
    expect(() => parseOrThrow(createHabitSchema, { ...validHabit, difficulty: "nem" }))
      .toThrow("Sværhedsgrad skal være let, middel eller svær");
  });

  it("afviser manglende body med ValidationError", () => {
    expect(() => parseOrThrow(createHabitSchema, undefined)).toThrow(ValidationError);
  });
});
