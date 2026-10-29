import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../../src/middleware/requireAuth";
import { signToken } from "../../src/lib/jwt";
import { env } from "../../src/config/env";
import { UnauthorizedError } from "../../src/errors/authErrors";

// Laver en falsk request, der kun har den Authorization-header, testen har brug for
function fakeRequest(authorization?: string) {
  return { headers: { authorization } } as unknown as Request;
}

const res = {} as Response;

// Tjekker, at middlewaren stoppede forespørgslen med en UnauthorizedError
function expectUnauthorized(next: jest.Mock) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
}

describe("requireAuth", () => {
  it("sætter req.userId og fortsætter ved en gyldig token", () => {
    const req = fakeRequest(`Bearer ${signToken("bruger-123")}`);
    const next = jest.fn();

    requireAuth(req, res, next as NextFunction);

    expect(req.userId).toBe("bruger-123");
    // next() uden argument betyder "alt i orden, fortsæt til routen"
    expect(next).toHaveBeenCalledWith();
  });

  it("afviser en request uden Authorization-header", () => {
    const req = fakeRequest();
    const next = jest.fn();

    requireAuth(req, res, next as NextFunction);

    expectUnauthorized(next);
    expect(req.userId).toBeUndefined();
  });

  it("afviser en header, der ikke starter med 'Bearer '", () => {
    const req = fakeRequest(signToken("bruger-123"));
    const next = jest.fn();

    requireAuth(req, res, next as NextFunction);

    expectUnauthorized(next);
  });

  it("afviser en ugyldig token", () => {
    const req = fakeRequest("Bearer snyd");
    const next = jest.fn();

    requireAuth(req, res, next as NextFunction);

    expectUnauthorized(next);
    expect(req.userId).toBeUndefined();
  });

  it("afviser en udløbet token", () => {
    const etMinutSiden = Math.floor(Date.now() / 1000) - 60;
    const expired = jwt.sign({ exp: etMinutSiden }, env.JWT_SECRET, { subject: "bruger-123" });
    const req = fakeRequest(`Bearer ${expired}`);
    const next = jest.fn();

    requireAuth(req, res, next as NextFunction);

    expectUnauthorized(next);
  });
});
