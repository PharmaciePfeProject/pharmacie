import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import {
  getStockMovementById,
  listStockMovements,
} from "./stock-movements.controller.js";
import {
  stockMovementParamsSchema,
  stockMovementQuerySchema,
} from "./stock-movements.schemas.js";

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

r.get("/stock-movements", requireAuth, validate(stockMovementQuerySchema, "query"), listStockMovements);
r.get(
  "/stock-movements/:id",
  requireAuth,
  validate(stockMovementParamsSchema, "params"),
  getStockMovementById
);

export default r;
