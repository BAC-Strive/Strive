import { AppError } from "./appError";

//Vanen findes ikke, eller den tilhører en anden bruger
export class HabitNotFoundError extends AppError {
    constructor() {
        super(404, "Vanen findes ikke");
    }
}