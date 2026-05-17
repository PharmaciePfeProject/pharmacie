import { api } from "./axios";
export async function fetchExternalOrders(params = {}) {
    const res = await api.get("/api/external-orders", { params });
    return res.data;
}
export async function fetchExternalOrderById(id) {
    const res = await api.get(`/api/external-orders/${id}`);
    return res.data.item;
}
export async function createExternalOrder(payload) {
    const res = await api.post("/api/external-orders", payload);
    return res.data.item;
}
export async function registerExternalInvoice(id, payload) {
    const res = await api.post(`/api/external-orders/${id}/invoice`, payload);
    return res.data;
}
export async function fetchInternalOrders(params = {}) {
    const res = await api.get("/api/internal-orders", { params });
    return res.data;
}
export async function fetchInternalOrderById(id) {
    const res = await api.get(`/api/internal-orders/${id}`);
    return res.data.item;
}
export async function createInternalOrder(payload) {
    const res = await api.post("/api/internal-orders", payload);
    return res.data.item;
}
export async function decideInternalOrder(id, payload) {
    const res = await api.post(`/api/internal-orders/${id}/decision`, payload);
    return res.data;
}
export async function fetchPendingInternalOrderApprovals() {
    const res = await api.get("/api/internal-orders/pending-approvals");
    return res.data.items || [];
}
export async function fetchReceptions(params = {}) {
    const res = await api.get("/api/receptions", { params });
    return res.data;
}
export async function fetchReceptionById(id) {
    const res = await api.get(`/api/receptions/${id}`);
    return res.data.item;
}
export async function fetchInternalDeliveries(params = {}) {
    const res = await api.get("/api/internal-deliveries", { params });
    return res.data;
}
export async function fetchInternalDeliveryById(id) {
    const res = await api.get(`/api/internal-deliveries/${id}`);
    return res.data.item;
}
