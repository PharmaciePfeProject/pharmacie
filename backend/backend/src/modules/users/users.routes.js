import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requireRole } from "../../middleware/requireRole.js";

const r = Router();

// Example: only ADMIN (roleId = 1)
r.get("/admin-only", requireAuth, requireRole([1]), (req, res) => {
  res.json({ ok: true, message: "Welcome admin!", user: req.user });
});

export default r;