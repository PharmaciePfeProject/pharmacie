import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  createManagedUser,
  deleteManagedUser,
  listUsers,
  updateManagedUser,
  updateUserStatus,
  updateUserRoles,
  updateUserDepot,
} from "./users.controller.js";
import {
  createManagedUserSchema,
  updateManagedUserSchema,
  updateUserRolesSchema,
  updateUserDepotSchema,
  updateUserStatusSchema,
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
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(userParamsSchema, "params"),
  validate(updateManagedUserSchema),
  updateManagedUser,
);
r.patch(
  "/:id/status",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(userParamsSchema, "params"),
  validate(updateUserStatusSchema),
  updateUserStatus,
);
r.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(userParamsSchema, "params"),
  deleteManagedUser,
);
r.put(
  "/:id/roles",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(userParamsSchema, "params"),
  validate(updateUserRolesSchema),
  updateUserRoles,
);
r.put(
  "/:id/depot",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(userParamsSchema, "params"),
  validate(updateUserDepotSchema),
  updateUserDepot,
);

export default r;
