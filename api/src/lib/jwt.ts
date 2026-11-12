import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from "../config/env";

// Laver en token med brugerens id, underskrevet med JWT_SECRET
export function signToken(userId: string): string {
    return jwt.sign({}, env.JWT_SECRET, {
        subject: userId,
        // "as" fortæller TypeScript, at værdien fra .env har et gyldigt format som "30d"
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
        algorithm: "HS256",
    });
}

// Returnerer userId. Kaster, hvis tokenen er forfalsket eller udløbet.
export function verifyToken(token: string): string {
    // Lås algoritmen, så en angriber ikke kan vælge en anden
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || !payload.sub) {
        throw new Error("Token mangler subject");
    }
    return payload.sub;
}