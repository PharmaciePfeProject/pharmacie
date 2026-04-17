import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { requireRole } from "../../middleware/requireRole.js";
import { PERMISSIONS, ROLE_KEYS } from "../../utils/rbac.js";
import {
  createPrescription,
  exportPrescriptionsExcel,
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
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  validate(prescriptionQuerySchema, "query"),
  listPrescriptions
);

r.get(
  "/prescriptions/doctors",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  listPrescriptionDoctors
);

r.get(
  "/prescriptions/agents",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  listPrescriptionAgents
);

r.get(
  "/prescriptions/types",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  listPrescriptionTypes
);

r.get(
  "/prescriptions/export/excel",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  validate(prescriptionQuerySchema, "query"),
  exportPrescriptionsExcel
);

r.get(
  "/prescriptions/:id",
  requireAuth,
  requirePermission(PERMISSIONS.DISTRIBUTIONS_READ),
  validate(prescriptionParamsSchema, "params"),
  getPrescriptionById
);

r.post(
  "/prescriptions",
  requireAuth,
  requireRole([ROLE_KEYS.ADMIN, ROLE_KEYS.MEDECIN]),
  validate(createPrescriptionBodySchema),
  createPrescription
);

export default r;
