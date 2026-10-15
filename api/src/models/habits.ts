import { Schema, model, InferSchemaType, Types } from "mongoose";

export const DIFFICULTIES = ["let", "middel", "svær"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

const habitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    weekdays: {
      type: [Number],
      required: true,
      validate: {
        validator: (days: number[]) =>
          days.length > 0 && days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "weekdays skal indeholde mindst én dag mellem 0 og 6",
      },
    },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Habit = InferSchemaType<typeof habitSchema> & { _id: Types.ObjectId };
export const HabitModel = model("Habit", habitSchema);