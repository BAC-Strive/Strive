import { AppError } from "./appError";

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class EmailTakenError extends AppError {
  constructor() {
    super(409, "Email er allerede i brug");
  }
}

// Samme besked for forkert email og forkert adgangskode (US2)
export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, "Forkert email eller adgangskode");
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, "Du skal være logget ind");
  }
}