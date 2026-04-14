import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  createManagedUser,
  listUsers,
  updateUserRoles,
} from "./users.controller.js";
import {
  createManagedUserSchema,
  updateUserRolesSchema,
  userParamsSchema,
} from "./users.schemas.js";

const r = Router();

function validate(schema, target = "body") {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }

    req[target] = parsed.data;
    next();
  };
}

r.get("/", requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), listUsers);
r.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(createManagedUserSchema),
  createManagedUser,
);
r.put(
  "/:id/roles",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(userParamsSchema, "params"),
  validate(updateUserRolesSchema),
  updateUserRoles,
);

export default r;
