import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  externalInvoiceCreateSchema,
  entityParamsSchema,
  externalOrderCreateSchema,
  externalOrderQuerySchema,
  internalOrderCreateSchema,
  internalOrderDecisionSchema,
  internalDeliveryQuerySchema,
  internalOrderQuerySchema,
  receptionQuerySchema,
} from "./supply-flow.schemas.js";
import {
  createExternalOrder,
  createInternalOrder,
  decideInternalOrder,
  getExternalOrderById,
  getInternalDeliveryById,
  getInternalOrderById,
  getReceptionById,
  listPendingInternalOrderApprovals,
  registerExternalInvoice,
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
r.post(
  "/external-orders",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_MANAGE),
  validate(externalOrderCreateSchema),
  createExternalOrder,
);
r.get(
  "/external-orders/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(entityParamsSchema, "params"),
  getExternalOrderById,
);
r.post(
  "/external-orders/:id/invoice",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_MANAGE),
  validate(entityParamsSchema, "params"),
  validate(externalInvoiceCreateSchema),
  registerExternalInvoice,
);
r.get(
  "/internal-orders",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(internalOrderQuerySchema, "query"),
  listInternalOrders,
);
r.post(
  "/internal-orders",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_MANAGE),
  validate(internalOrderCreateSchema),
  createInternalOrder,
);
r.get(
  "/internal-orders/pending-approvals",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_MANAGE),
  listPendingInternalOrderApprovals,
);
r.get(
  "/internal-orders/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_READ),
  validate(entityParamsSchema, "params"),
  getInternalOrderById,
);
r.post(
  "/internal-orders/:id/decision",
  requireAuth,
  requirePermission(PERMISSIONS.SUPPLY_MANAGE),
  validate(entityParamsSchema, "params"),
  validate(internalOrderDecisionSchema),
  decideInternalOrder,
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
