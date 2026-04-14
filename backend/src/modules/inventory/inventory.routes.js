import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import { getInventoryById, listInventories } from "./inventory.controller.js";
import {
  inventoryParamsSchema,
  inventoryQuerySchema,
} from "./inventory.schemas.js";

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

r.get(
  "/inventories",
  requireAuth,
  requirePermission(PERMISSIONS.INVENTORIES_READ),
  validate(inventoryQuerySchema, "query"),
  listInventories,
);
r.get(
  "/inventories/:id",
  requireAuth,
  requirePermission(PERMISSIONS.INVENTORIES_READ),
  validate(inventoryParamsSchema, "params"),
  getInventoryById,
);

export default r;
