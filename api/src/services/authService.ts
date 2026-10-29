import bcrypt from "bcryptjs";
import { UserModel, toPublicUser } from "../models/user";
import { signToken } from "../lib/jwt";
import { EmailTakenError, InvalidCredentialsError, UnauthorizedError } from "../errors/authErrors";
import type { LoginInput, RegisterInput } from "../validation/auth";

const SALT_ROUNDS = 12;
// Dummy-hash bruges til at gøre timing af login-forsøg ens, uanset om emailen findes eller ej.
const DUMMY_HASH = bcrypt.hashSync("timing-dummy-password", SALT_ROUNDS);

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

export async function login({ email, password }: LoginInput) {
	// passwordHash er skjult som standard, så vi skal eksplicit bede om det med .select("+passwordHash").
	const user = await UserModel.findOne({ email }).select("+passwordHash");

	if (!user) {
		// Sammenlign alligevel, så svartiden ikke afslører, at emailen ikke findes.
		await bcrypt.compare(password, DUMMY_HASH);
		throw new InvalidCredentialsError();
	}

	// Hvis adgangskoden ikke passer med hashen gives samme fejl som ovenfor, så det ikke afsløres, om emailen findes eller ej.
	if (!(await user.comparePassword(password))) {
		throw new InvalidCredentialsError();
	}

	// Login lykkedes: returnér token og brugerens offentlige data (uden passwordHash).
	return { token: signToken(user._id.toString()), user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string) {
	const user = await UserModel.findById(userId);
	// Tokenen er gyldig, men brugeren findes ikke i databasen (måske slettet).
	// I så fald sendes 401 Unauthorized-fejl.
	if (!user) throw new UnauthorizedError();
	// Hvis brugeren findes, returnér den offentlige version af brugeren (uden passwordHash).
	return toPublicUser(user);
}

function isDuplicateEmailError(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	const e = err as { code?: unknown; keyPattern?: Record<string, unknown> };
	// Kode 11000 er MongoDBs fejlkode for “dublet på et unikt felt”.
	return e.code === 11000 && e.keyPattern?.email !== undefined;
}