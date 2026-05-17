import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  getDistributionById,
  listDistributions,
} from "./distribution.controller.js";
import {
  distributionParamsSchema,
  distributionQuerySchema,
} from "./distribution.schemas.js";

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
  "/distributions",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  validate(distributionQuerySchema, "query"),
  listDistributions,
);
r.get(
  "/distributions/:id",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  validate(distributionParamsSchema, "params"),
  getDistributionById,
);

export default r;
