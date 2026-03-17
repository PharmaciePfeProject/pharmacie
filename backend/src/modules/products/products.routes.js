import { Router } from "express";
import {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "./products.controller.js";
import { productBodySchema, productParamsSchema, productQuerySchema } from "./products.schemas.js";
import { requireAuth } from "../../middleware/authJwt.js";

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

r.get("/", requireAuth, validate(productQuerySchema, "query"), listProducts);
r.get("/:id", requireAuth, validate(productParamsSchema, "params"), getProductById);
r.post("/", requireAuth, validate(productBodySchema), createProduct);
r.put(
  "/:id",
  requireAuth,
  validate(productParamsSchema, "params"),
  validate(productBodySchema),
  updateProduct
);

export default r;
