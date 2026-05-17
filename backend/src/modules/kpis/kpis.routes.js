import { Router } from "express";
import {
  getStockKPIs,
  getPrescriptionsKPIs,
  getDistributionKPIs,
  getReportingKPIs,
  getAllKPIs,
} from "./kpis.controller.js";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";

const router = Router();

// Les KPIs sont réservés aux administrateurs
router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.ADMIN_ACCESS));

// KPIs globaux
router.get("/", getAllKPIs);

// KPIs par domaine
router.get("/stock", getStockKPIs);

router.get("/prescriptions", getPrescriptionsKPIs);

router.get("/distributions", getDistributionKPIs);

router.get("/reporting", getReportingKPIs);

export default router;
