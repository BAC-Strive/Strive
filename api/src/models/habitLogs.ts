import { Schema, model, InferSchemaType, Types } from "mongoose";

const habitLogSchema = new Schema({
  habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true },
  completedAt: { type: Date, required: true }, // altid sat til dagens start (00:00)
  pointsAwarded: { type: Number, required: true, min: 0 },
});

// Én gennemførsel pr. vane pr. dag
habitLogSchema.index({ habitId: 1, completedAt: 1 }, { unique: true });

export type HabitLog = InferSchemaType<typeof habitLogSchema> & { _id: Types.ObjectId };
export const HabitLogModel = model("HabitLog", habitLogSchema);