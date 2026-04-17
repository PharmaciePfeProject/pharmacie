import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  entityParamsSchema,
  externalOrderQuerySchema,
  internalDeliveryQuerySchema,
  internalOrderQuerySchema,
  receptionQuerySchema,
} from "./supply-flow.schemas.js";
import {
  getExternalOrderById,
  getInternalDeliveryById,
  getInternalOrderById,
  getReceptionById,
  listExternalOrders,
  listInternalDeliveries,
  listInternalOrders,
  listReceptions,
} from "./supply-flow.controller.js";

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
  "/external-orders",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(externalOrderQuerySchema, "query"),
  listExternalOrders,
);
r.get(
  "/external-orders/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(entityParamsSchema, "params"),
  getExternalOrderById,
);
r.get(
  "/internal-orders",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(internalOrderQuerySchema, "query"),
  listInternalOrders,
);
r.get(
  "/internal-orders/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(entityParamsSchema, "params"),
  getInternalOrderById,
);
r.get(
  "/receptions",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(receptionQuerySchema, "query"),
  listReceptions,
);
r.get(
  "/receptions/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(entityParamsSchema, "params"),
  getReceptionById,
);
r.get(
  "/internal-deliveries",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(internalDeliveryQuerySchema, "query"),
  listInternalDeliveries,
);
r.get(
  "/internal-deliveries/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(entityParamsSchema, "params"),
  getInternalDeliveryById,
);

export default r;
