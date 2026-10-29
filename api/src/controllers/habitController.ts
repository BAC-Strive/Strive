import { Router } from "express";
import * as habitService from "../services/habitService";
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
