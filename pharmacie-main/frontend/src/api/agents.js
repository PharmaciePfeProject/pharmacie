import { api } from "./axios";

export const agentAPI = {
  // Get all agents with pagination
  listAgents: (params = {}) =>
    api.get("/api/agents", { params }).then((res) => res.data),

  // Get agent by ID
  getAgent: (agentId) =>
    api.get(`/api/agents/${agentId}`).then((res) => res.data),

  // Create new agent
  createAgent: (data) =>
    api.post("/api/agents", data).then((res) => res.data),

  // Update agent
  updateAgent: (agentId, data) =>
    api.put(`/api/agents/${agentId}`, data).then((res) => res.data),

  // Delete agent
  deleteAgent: (agentId) =>
    api.delete(`/api/agents/${agentId}`).then((res) => res.data),
};
