import { Schema, model, InferSchemaType, Types } from "mongoose";

const habitLogSchema = new Schema({
  habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true },
  completedAt: { type: Date, required: true }, // altid sat til dagens start (00:00)
  pointsAwarded: { type: Number, required: true, min: 0 }, // 0 på en beskyttet dag
  // Et skjold (købt med point) gemmes som en log for dagen. Gamle logs mangler feltet, så brug
  // { $ne: true } og ikke false, når du leder efter gennemførsler.
  isProtected: { type: Boolean, default: false },
  pointsSpent: { type: Number, default: 0, min: 0 }, // prisen på skjoldet, så den kan refunderes
});

// Én log pr. vane pr. dag. Det gælder både en gennemførsel og et skjold, så en dag
// ikke kan være gennemført og beskyttet på samme tid.
habitLogSchema.index({ habitId: 1, completedAt: 1 }, { unique: true });

export type HabitLog = InferSchemaType<typeof habitLogSchema> & { _id: Types.ObjectId };
export const HabitLogModel = model("HabitLog", habitLogSchema);
