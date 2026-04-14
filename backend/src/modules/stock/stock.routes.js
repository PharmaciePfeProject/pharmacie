import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  getStockById,
  getStockLotById,
  listStock,
  listStockLots,
} from "./stock.controller.js";
import {
  stockLotQuerySchema,
  stockParamsSchema,
  stockQuerySchema,
} from "./stock.schemas.js";

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
  "/stock",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_READ),
  validate(stockQuerySchema, "query"),
  listStock,
);
r.get(
  "/stock/:id",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_READ),
  validate(stockParamsSchema, "params"),
  getStockById,
);
r.get(
  "/stock-lots",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_READ),
  validate(stockLotQuerySchema, "query"),
  listStockLots,
);
r.get(
  "/stock-lots/:id",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_READ),
  validate(stockParamsSchema, "params"),
  getStockLotById,
);

export default r;
