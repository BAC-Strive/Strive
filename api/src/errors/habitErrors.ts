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
