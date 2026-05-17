import { Router } from "express";
import { requireAuth } from "../../middleware/authJwt.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../utils/rbac.js";
import {
  listAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
} from "./agents.controller.js";
import {
  agentQuerySchema,
  createAgentBodySchema,
  updateAgentBodySchema,
  agentParamsSchema,
} from "./agents.schemas.js";

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

// Get all agents with pagination
r.get(
  "/agents",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ, PERMISSIONS.ADMIN_ACCESS),
  validate(agentQuerySchema, "query"),
  listAgents
);

// Get agent by ID
r.get(
  "/agents/:agent_id",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_READ, PERMISSIONS.ADMIN_ACCESS),
  validate(agentParamsSchema, "params"),
  getAgentById
);

// Create agent
r.post(
  "/agents",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_WRITE, PERMISSIONS.ADMIN_ACCESS),
  validate(createAgentBodySchema, "body"),
  createAgent
);

// Update agent
r.put(
  "/agents/:agent_id",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_WRITE, PERMISSIONS.ADMIN_ACCESS),
  validate(agentParamsSchema, "params"),
  validate(updateAgentBodySchema, "body"),
  updateAgent
);

// Delete agent
r.delete(
  "/agents/:agent_id",
  requireAuth,
  requirePermission(PERMISSIONS.PRESCRIPTIONS_WRITE, PERMISSIONS.ADMIN_ACCESS),
  validate(agentParamsSchema, "params"),
  deleteAgent
);

export default r;
