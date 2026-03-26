import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import {
  createLocation,
  createMovementType,
  listLocations,
  listMovementTypes,
  listPharmaClasses,
  listProductTypes,
  listDci,
} from "./references.controller.js";
import { locationBodySchema, movementTypeBodySchema } from "./references.schemas.js";

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

r.get("/locations", requireAuth, listLocations);
r.post("/locations", requireAuth, validate(locationBodySchema), createLocation);

r.get("/movement-types", requireAuth, listMovementTypes);
r.post(
  "/movement-types",
  requireAuth,
  validate(movementTypeBodySchema),
  createMovementType
);

r.get("/pharma-classes", requireAuth, listPharmaClasses);
r.get("/product-types", requireAuth, listProductTypes);
r.get("/dci", requireAuth, listDci);

export default r;
