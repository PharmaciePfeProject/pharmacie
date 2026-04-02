import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  createPrescription,
  getPrescriptionById,
  listPrescriptionAgents,
  listPrescriptionDoctors,
  listPrescriptions,
  listPrescriptionTypes,
} from "./prescriptions.controller.js";
import {
  createPrescriptionBodySchema,
  prescriptionParamsSchema,
  prescriptionQuerySchema,
} from "./prescriptions.schemas.js";

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
  "/prescriptions",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ),
  validate(prescriptionQuerySchema, "query"),
  listPrescriptions
);

r.get(
  "/prescriptions/doctors",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ),
  listPrescriptionDoctors
);

r.get(
  "/prescriptions/agents",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ),
  listPrescriptionAgents
);

r.get(
  "/prescriptions/types",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ),
  listPrescriptionTypes
);

r.get(
  "/prescriptions/:id",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ),
  validate(prescriptionParamsSchema, "params"),
  getPrescriptionById
);

r.post(
  "/prescriptions",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_MANAGE),
  validate(createPrescriptionBodySchema),
  createPrescription
);

export default r;
