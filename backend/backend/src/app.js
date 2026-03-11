import "express-async-errors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { swaggerSpec } from "./config/swagger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.get("/debug", (req, res) => res.json({ ok: true, docs: true }));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // Security headers
  app.use(helmet());

  // Allow frontend requests
  app.use(cors());

  // Parse JSON body
  app.use(express.json());
  
  // Health check
  app.get("/health", (req, res) => res.json({ ok: true }));

  // Login rate limiter (anti brute-force)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // max 10 requests per IP
    message: {
      message: "Too many login attempts, try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Apply rate limit only to login
  app.use("/api/auth/login", loginLimiter);

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);

  // Error handler (must always be last)
  app.use(errorHandler);

  return app;
}