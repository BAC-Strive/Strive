import express from "express";
import { notFound, errorHandler } from "./middleware/errorHandler";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use(notFound);
app.use(errorHandler);

export default app;
