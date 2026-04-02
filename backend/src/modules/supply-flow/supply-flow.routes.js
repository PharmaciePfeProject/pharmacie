import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
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

r.get("/external-orders", requireAuth, validate(externalOrderQuerySchema, "query"), listExternalOrders);
r.get("/external-orders/:id", requireAuth, validate(entityParamsSchema, "params"), getExternalOrderById);
r.get("/internal-orders", requireAuth, validate(internalOrderQuerySchema, "query"), listInternalOrders);
r.get("/internal-orders/:id", requireAuth, validate(entityParamsSchema, "params"), getInternalOrderById);
r.get("/receptions", requireAuth, validate(receptionQuerySchema, "query"), listReceptions);
r.get("/receptions/:id", requireAuth, validate(entityParamsSchema, "params"), getReceptionById);
r.get("/internal-deliveries", requireAuth, validate(internalDeliveryQuerySchema, "query"), listInternalDeliveries);
r.get("/internal-deliveries/:id", requireAuth, validate(entityParamsSchema, "params"), getInternalDeliveryById);

export default r;
