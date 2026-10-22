import "dotenv/config";

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    mongoURI: process.env.MONGO_URI || "mongodb://localhost:27017/strive",
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
};