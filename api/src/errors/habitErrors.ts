import { AppError } from "./appError";

//Vanen findes ikke, eller den tilhører en anden bruger
export class HabitNotFoundError extends AppError {
    constructor() {
        super(404, "Vanen findes ikke");
    }
}

//Vanen har allerede en gennemførsel for i dag
export class HabitAlreadyCompletedError extends AppError {
    constructor() {
        super(409, "Vanen er allerede gennemført i dag");
    }
}