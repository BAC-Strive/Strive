import { Schema, model, InferSchemaType, Types } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    // Vises som "Fornavn" i appen. Ikke unikt, da login sker med email.
    username: { type: String, required: true, trim: true, maxLength: 50 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // select: false: hentes kun med .select("+passwordHash") i login, så det ikke sendes med i API-responsen.
    passwordHash: { type: String, required: true, select: false },
    totalPoints: { type: Number, default: 0, min: 0 },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false },
    methods: {
      comparePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
      },
    },
  }
);

export type User = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const UserModel = model("User", userSchema);