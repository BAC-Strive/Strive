import { Router } from "express";
import * as habitService from "../services/habitService";
import * as rewardService from "../services/rewardService";
import { createHabitSchema } from "../validation/habit";
import { parseOrThrow } from "../validation/auth";
import { requireAuth } from "../middleware/requireAuth";

// Samler alle /habits-routes. Mountes i app.ts under "/habits".
export const habitRouter = Router();

// Alle vane-routes kræver login. requireAuth sætter req.userId.
habitRouter.use(requireAuth);

// GET /habits: henter brugerens vaner
habitRouter.get("/", async (req, res) => {
  // requireAuth har altid sat userId her, så "!" fortæller TypeScript, at den ikke er undefined
  const habits = await habitService.getOverview(req.userId!);
  res.status(200).json(habits);
});

// POST /habits: opretter en vane (US6)
habitRouter.post("/", async (req, res) => {
  // Kaster ValidationError (400), hvis et felt mangler eller er ugyldigt
  const input = parseOrThrow(createHabitSchema, req.body);
  const habit = await habitService.createHabit(req.userId!, input);
  res.status(201).json(habit);
});

// DELETE /habits/:id: sletter en vane og dens gennemførsler (US9)
habitRouter.delete("/:id", async (req, res) => {
  // Kaster HabitNotFoundError (404), hvis vanen ikke findes eller tilhører en anden
  await habitService.deleteHabit(req.userId!, req.params.id);
  res.status(204).end();
});

// POST /habits/:id/complete: gennemfører en vane for i dag
habitRouter.post("/:id/complete", async (req, res) => {
  // Kaster HabitNotFoundError (404), HabitAlreadyCompletedError (409) eller HabitNotScheduledError (400).
  // Ugyldigt id giver også 400 (CastError).
  const result = await habitService.completeHabit(req.userId!, req.params.id);
  res.status(201).json(result);
});

// DELETE /habits/:id/complete: fortryder dagens gennemførsel og trækker pointene tilbage (US8)
habitRouter.delete("/:id/complete", async (req, res) => {
  // Kaster HabitNotFoundError (404) eller HabitNotCompletedError (409). Ugyldigt id giver 400 (CastError).
  const result = await habitService.undoCompleteHabit(req.userId!, req.params.id);
  res.status(200).json(result);
});

// POST /habits/:id/protect: køber et skjold til i dag med point, så streaken ikke brydes
habitRouter.post("/:id/protect", async (req, res) => {
  // Kaster HabitNotFoundError (404), HabitNotScheduledError (400) eller en 409, hvis dagen allerede er
  // gennemført eller beskyttet, der ingen streak er, eller der ikke er point nok. Ugyldigt id giver 400.
  const result = await rewardService.protectStreak(req.userId!, req.params.id);
  res.status(201).json(result);
});

// DELETE /habits/:id/protect: fortryder dagens skjold og giver pointene tilbage
habitRouter.delete("/:id/protect", async (req, res) => {
  // Kaster HabitNotFoundError (404) eller HabitNotProtectedError (409). Ugyldigt id giver 400.
  const result = await rewardService.unprotectStreak(req.userId!, req.params.id);
  res.status(200).json(result);
});
