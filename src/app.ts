import express from "express";
import { PrismaClient } from "../generated/prisma/index.js";

import { checkHeader } from "./middlewares/authorization";
import apiRouter from "./routes";
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(checkHeader);

// Routes
app.use("/api", apiRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

export { app, prisma };
