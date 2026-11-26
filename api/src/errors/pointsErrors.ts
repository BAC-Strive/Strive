import { AppError } from "./appError";

// Brugeren har ikke point nok til at købe et skjold
export class NotEnoughPointsError extends AppError {
    constructor() {
        super(409, "Du har ikke nok point");
    }
}

// Brugeren har ikke point nok til at trække de point tilbage, en gennemførsel gav (de er brugt)
export class PointsAlreadySpentError extends AppError {
    constructor() {
        super(409, "Du har ikke point nok til at fortryde gennemførslen");
    }
}
