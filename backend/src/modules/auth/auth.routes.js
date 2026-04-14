import { Router } from "express";
import { login, me, updateMe, updateMyPassword } from "./auth.controller.js";
import {
  loginSchema,
  updateMeSchema,
  updatePasswordSchema,
} from "./auth.schemas.js";
import { requireAuth } from "../../middleware/authJwt.js";

const r = Router();

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };
}

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emailOrUsername, password]
 *             properties:
 *               emailOrUsername:
 *                 type: string
 *                 example: "test@transtu.tn"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
r.post("/login", validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
r.get("/me", requireAuth, me);
r.put("/me", requireAuth, validate(updateMeSchema), updateMe);
r.put(
  "/me/password",
  requireAuth,
  validate(updatePasswordSchema),
  updateMyPassword,
);

export default r;
