import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  createLocation,
  createMovementType,
  listLocations,
  listMovementTypes,
  listPharmaClasses,
  listProductTypes,
  listDci,
} from "./references.controller.js";
import {
  locationBodySchema,
  movementTypeBodySchema,
} from "./references.schemas.js";

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
  "/locations",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_READ, PERMISSIONS.USERS_MANAGE),
  listLocations,
);
r.post(
  "/locations",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_MANAGE),
  validate(locationBodySchema),
  createLocation,
);

r.get(
  "/movement-types",
  requireAuth,
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  listMovementTypes,
);
r.post(
  "/movement-types",
  requireAuth,
  requirePermission(PERMISSIONS.STOCK_MANAGE),
  validate(movementTypeBodySchema),
  createMovementType,
);

r.get(
  "/pharma-classes",
  requireAuth,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  listPharmaClasses,
);
r.get(
  "/product-types",
  requireAuth,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  listProductTypes,
);
r.get(
  "/dci",
  requireAuth,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  listDci,
);

export default r;
