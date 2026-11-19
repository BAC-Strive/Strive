import { AppError } from "./appError";

// Vanen findes ikke, eller den tilhører en anden bruger
export class HabitNotFoundError extends AppError {
    constructor() {
        super(404, "Vanen findes ikke");
    }
}

// Vanen har allerede en gennemførsel for i dag
export class HabitAlreadyCompletedError extends AppError {
    constructor() {
        super(409, "Vanen er allerede gennemført i dag");
    }
}

// Der er ingen gennemførsel for i dag at fortryde
export class HabitNotCompletedError extends AppError {
    constructor() {
        super(409, "Vanen er ikke gennemført i dag");
    }
}

// Vanen er ikke planlagt til den ugedag, den forsøges gennemført på
export class HabitNotScheduledError extends AppError {
    constructor() {
        super(400, "Vanen skal ikke gennemføres i dag");
    }
}

// Dagen er allerede beskyttet med et skjold
export class HabitAlreadyProtectedError extends AppError {
    constructor() {
        super(409, "Vanen er allerede beskyttet i dag");
    }
}

// Der er ingen streak at beskytte (vanen er ny, eller streaken er brudt)
export class NoStreakToProtectError extends AppError {
    constructor() {
        super(409, "Der er ingen streak at beskytte");
    }
}

// Der er intet skjold for i dag at fortryde
export class HabitNotProtectedError extends AppError {
    constructor() {
        super(409, "Vanen er ikke beskyttet i dag");
    }
}

// Brugeren har ikke point nok til at købe et skjold
export class NotEnoughPointsError extends AppError {
    constructor() {
        super(409, "Du har ikke nok point");
    }
}

// Brugeren har brugt de point, en gennemførsel gav, så den kan ikke fortrydes
export class PointsAlreadySpentError extends AppError {
    constructor() {
        super(409, "Du har brugt pointene fra gennemførslen og kan derfor ikke fortryde den");
    }
}
