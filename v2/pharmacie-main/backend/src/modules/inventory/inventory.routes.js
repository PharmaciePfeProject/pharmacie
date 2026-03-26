import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { getInventoryById, listInventories } from "./inventory.controller.js";
import { inventoryParamsSchema, inventoryQuerySchema } from "./inventory.schemas.js";

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

r.get("/inventories", requireAuth, validate(inventoryQuerySchema, "query"), listInventories);
r.get("/inventories/:id", requireAuth, validate(inventoryParamsSchema, "params"), getInventoryById);

export default r;
