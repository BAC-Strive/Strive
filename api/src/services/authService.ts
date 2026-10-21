import bcrypt from "bcryptjs";
import { UserModel, toPublicUser } from "../models/user";
import { signToken } from "../lib/jwt";
import { EmailTakenError } from "../errors/authErrors";
import type { RegisterInput } from "../validation/auth";

const SALT_ROUNDS = 12;

export async function register({ username, email, password }: RegisterInput) {
  if (await UserModel.exists({ email })) throw new EmailTakenError();

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await UserModel.create({ username, email, passwordHash });
    return { token: signToken(user._id.toString()), user: toPublicUser(user) };
  } catch (err) {
    // To samtidige oprettelser kan begge slippe forbi exists-tjekket ovenfor.
    // Databasens unikke index fanger den ene, og den skal også give 409.
    if (isDuplicateEmailError(err)) throw new EmailTakenError();
    throw err;
  }
}

function isDuplicateEmailError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; keyPattern?: Record<string, unknown> };
  // Kode 11000 er MongoDBs fejlkode for “dublet på et unikt felt”.
  return e.code === 11000 && e.keyPattern?.email !== undefined;
}