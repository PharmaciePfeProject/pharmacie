import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  createDoctorRecord,
  listDoctors,
  toggleDoctorActive,
  updateDoctorRecord,
} from "./doctors.controller.js";
import {
  createDoctorBodySchema,
  doctorParamsSchema,
  doctorQuerySchema,
  updateDoctorBodySchema,
} from "./doctors.schemas.js";

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
  "/doctors",
  requireAuth,
  requirePermission(PERMISSIONS.DOCTORS_MANAGE),
  validate(doctorQuerySchema, "query"),
  listDoctors
);

r.post(
  "/doctors",
  requireAuth,
  requirePermission(PERMISSIONS.DOCTORS_MANAGE),
  validate(createDoctorBodySchema),
  createDoctorRecord
);

r.put(
  "/doctors/:id",
  requireAuth,
  requirePermission(PERMISSIONS.DOCTORS_MANAGE),
  validate(doctorParamsSchema, "params"),
  validate(updateDoctorBodySchema),
  updateDoctorRecord
);

r.patch(
  "/doctors/:id/toggle-active",
  requireAuth,
  requirePermission(PERMISSIONS.DOCTORS_MANAGE),
  validate(doctorParamsSchema, "params"),
  toggleDoctorActive
);

export default r;
