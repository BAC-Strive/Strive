import "dotenv/config";

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}. See .env.example for reference.`);
    }
    return value;
}

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    mongoURI: process.env.MONGO_URI || "mongodb://localhost:27017/strive",
    JWT_SECRET: required("JWT_SECRET"),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
};