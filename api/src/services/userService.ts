import { UserModel, toPublicUser } from "../models/user";
import { EmailTakenError, UnauthorizedError } from "../errors/authErrors";
import { isDuplicateKeyError } from "../lib/mongoErrors";
import type { UpdateProfileInput } from "../validation/user";

// Opdaterer fornavn og/eller email for den indloggede bruger (US3).
export async function updateProfile(userId: string, changes: UpdateProfileInput) {
  // Er emailen taget af en anden? $ne betyder "not equal", så vi tjekker kun andre brugere end den indloggede.
  if (changes.email && (await UserModel.exists({ email: changes.email, _id: { $ne: userId } }))) {
    throw new EmailTakenError();
  }

  try {
    // new: true returnerer den opdaterede bruger, runValidators: true tvinger Mongoose til at køre validering på ændringerne.
    const user = await UserModel.findByIdAndUpdate(userId, changes, { new: true, runValidators: true });
    // Tokenen er gyldig, men brugeren findes ikke i databasen (fx slettet).
    if (!user) throw new UnauthorizedError();
    return toPublicUser(user);
  } catch (err) {
    // Samme princip som ved oprettelse: To samtidige opdateringer kan begge slippe forbi exists-tjekket ovenfor.
    // Databasens unikke index fanger den ene, og den skal også give 409.
    if (isDuplicateKeyError(err, "email")) throw new EmailTakenError();
    throw err;
  }
}
