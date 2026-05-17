import { api } from "./axios";

export const appointmentsAPI = {
  getResources: () => api.get("/api/appointments/resources").then((r) => r.data),
  list: (params = {}) => api.get("/api/appointments", { params }).then((r) => r.data),
  create: (data) => api.post("/api/appointments", data).then((r) => r.data),
  update: (id, data) => api.put(`/api/appointments/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/api/appointments/${id}`).then((r) => r.data),
  listBlocks: (params = {}) => api.get("/api/appointments/blocks", { params }).then((r) => r.data),
  createBlock: (data) => api.post("/api/appointments/blocks", data).then((r) => r.data),
  updateBlock: (id, data) => api.put(`/api/appointments/blocks/${id}`, data).then((r) => r.data),
  removeBlock: (id) => api.delete(`/api/appointments/blocks/${id}`).then((r) => r.data),
  listRescheduleRequests: (params = {}) => api.get("/api/appointments/reschedule-requests", { params }).then((r) => r.data),
  createRescheduleRequest: (id, data) => api.post(`/api/appointments/${id}/reschedule-requests`, data).then((r) => r.data),
  decideRescheduleRequest: (id, data) => api.patch(`/api/appointments/reschedule-requests/${id}`, data).then((r) => r.data),
};
