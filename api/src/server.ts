import { env } from "./config/env";
import { app } from "./app";
import mongoose from "mongoose";

    
async function startServer() {
    await mongoose.connect(env.mongoURI);
    console.log("Connected to MongoDB");

    app.listen(env.PORT, "0.0.0.0", () => {
        console.log(`Server is running on port ${env.PORT}`);
        console.long(`Health check endpoint: http://localhost:${env.PORT}/health`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
