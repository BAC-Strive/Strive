import { loginSchema, parseOrThrow, registerSchema } from "../../src/validation/auth";
import { ValidationError } from "../../src/errors/authErrors";

const validUser = { username: "TestUser", email: "test@user.com", password: "TestPassword123" };

describe("registerSchema", () => {
  it("godkender gyldigt input og renser fornavn og email", () => {
    const result = parseOrThrow(registerSchema, {
      username: "  TestUser  ",
      email: "  Test@User.com ",
      password: "TestPassword123",
    });

    expect(result).toEqual({
      username: "TestUser",
      email: "test@user.com",
      password: "TestPassword123",
    });
  });

  it("afviser ugyldig email", () => {
    expect(() => parseOrThrow(registerSchema, { ...validUser, email: "ikke-en-email" }))
      .toThrow("Ugyldig email");
  });

  it("afviser adgangskode under 8 tegn", () => {
    expect(() => parseOrThrow(registerSchema, { ...validUser, password: "kort" }))
      .toThrow("Adgangskoden skal være mindst 8 tegn");
  });

  it("afviser adgangskode over 72 tegn", () => {
    expect(() => parseOrThrow(registerSchema, { ...validUser, password: "a".repeat(73) }))
      .toThrow("Adgangskoden må højst være 72 tegn");
  });

  it("afviser fornavn, der kun består af mellemrum", () => {
    expect(() => parseOrThrow(registerSchema, { ...validUser, username: "   " }))
      .toThrow("Fornavn skal udfyldes");
  });

  it("afviser manglende felter", () => {
    expect(() => parseOrThrow(registerSchema, {})).toThrow(ValidationError);
  });
});

describe("loginSchema", () => {
  it("godkender gyldigt login og gør email til små bogstaver", () => {
    const result = parseOrThrow(loginSchema, { email: "Test@User.com", password: "TestPassword123" });
    expect(result.email).toBe("test@user.com");
  });

  // Login skal kun afgøre, om adgangskoden er rigtig, ikke afsløre reglerne for den
  it("kræver ikke 8 tegn i adgangskoden", () => {
    expect(() => parseOrThrow(loginSchema, { email: "test@user.com", password: "kort" }))
      .not.toThrow();
  });

  it("afviser tom adgangskode", () => {
    expect(() => parseOrThrow(loginSchema, { email: "test@user.com", password: "" }))
      .toThrow("Adgangskode skal udfyldes");
  });
});

describe("parseOrThrow", () => {
  it("kaster en ValidationError med status 400", () => {
    // Sikrer at testen fejler, hvis der slet ikke kastes en fejl
    expect.assertions(2);

    try {
      parseOrThrow(loginSchema, {});
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).status).toBe(400);
    }
  });
});
