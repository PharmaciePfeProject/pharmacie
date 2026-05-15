import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  listAppointmentResources,
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listAppointmentBlocks,
  createAppointmentBlock,
  deleteAppointmentBlock,
  listAppointmentRescheduleRequests,
  createAppointmentRescheduleRequest,
  decideAppointmentRescheduleRequest,
} from "./appointments.controller.js";

const r = Router();

r.get("/appointments/resources", requireAuth, requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE), listAppointmentResources);
r.get(
  "/appointments",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE),
  listAppointments
);
r.post("/appointments", requireAuth, requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE), createAppointment);
r.put("/appointments/:id", requireAuth, requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE), updateAppointment);
r.delete("/appointments/:id", requireAuth, requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE), deleteAppointment);

r.get(
  "/appointments/blocks",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE),
  listAppointmentBlocks
);

r.post(
  "/appointments/blocks",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE),
  createAppointmentBlock
);

r.delete(
  "/appointments/blocks/:id",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE),
  deleteAppointmentBlock
);

r.get(
  "/appointments/reschedule-requests",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE),
  listAppointmentRescheduleRequests
);

r.post(
  "/appointments/:id/reschedule-requests",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE),
  createAppointmentRescheduleRequest
);

r.patch(
  "/appointments/reschedule-requests/:id",
  requireAuth,
  requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE),
  decideAppointmentRescheduleRequest
);

export default r;
