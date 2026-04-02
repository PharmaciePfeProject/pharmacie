import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import {
  getStockById,
  getStockLotById,
  listStock,
  listStockLots,
} from "./stock.controller.js";
import { stockLotQuerySchema, stockParamsSchema, stockQuerySchema } from "./stock.schemas.js";

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

r.get("/stock", requireAuth, validate(stockQuerySchema, "query"), listStock);
r.get("/stock/:id", requireAuth, validate(stockParamsSchema, "params"), getStockById);
r.get("/stock-lots", requireAuth, validate(stockLotQuerySchema, "query"), listStockLots);
r.get("/stock-lots/:id", requireAuth, validate(stockParamsSchema, "params"), getStockLotById);

export default r;
