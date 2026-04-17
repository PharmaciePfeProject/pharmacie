import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import { getAnalyticsKpis } from "./analytics.controller.js";

const r = Router();

r.get("/analytics/kpis", requireAuth, requirePermission(PERMISSIONS.ANALYTICS_READ), getAnalyticsKpis);

export default r;
