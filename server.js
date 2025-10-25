import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

import questionRoutes from "./routes/questionAnswer.js";  // Questions & answers routes

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// Routes
app.use("/api/users", userRoutes);       
app.use("/api/questions", questionRoutes); // questions & answers

// Start server
app.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
);
