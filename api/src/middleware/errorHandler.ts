import { ErrorRequestHandler, RequestHandler } from "express";
import { Error as MongooseError } from "mongoose";
import { AppError } from "../errors/appError";

// Ukendt rute → 404
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Ruten findes ikke" });
};

// Fælles fejlhåndtering, skal stå til sidst i app.ts
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Fejl, vi selv har kastet i services (400/401/404/409)
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  // Mongoose-validering fejlede (fx ugyldig difficulty eller weekdays)
  if (err instanceof MongooseError.ValidationError) {
    res.status(400).json({ message: err.message });
    return;
  }

    // Ugyldigt id i URL'en (fx DELETE /habits/abc)
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ message: "Ugyldigt id" });
    return;
  }

  // Ugyldig JSON i request-body
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Ugyldig JSON" });
    return;
  }

  // Alt andet er en uventet fejl → 500. Detaljer logges, men sendes ikke til klienten.
  console.error(err);
  res.status(500).json({ message: "Noget gik galt" });
};