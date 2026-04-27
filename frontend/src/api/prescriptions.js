import { api } from "./axios";
export async function fetchPrescriptions(filters = {}) {
    const res = await api.get("/api/prescriptions", {
        params: filters,
    });
    return res.data;
}
export async function fetchPrescriptionById(id) {
    const res = await api.get(`/api/prescriptions/${id}`);
    return res.data.item;
}
export async function createPrescription(payload) {
    const res = await api.post("/api/prescriptions", payload);
    return res.data.item;
}
export async function fetchPrescriptionDoctors() {
    const res = await api.get("/api/prescriptions/doctors");
    return res.data.items;
}
export async function fetchPrescriptionAgents() {
    const res = await api.get("/api/prescriptions/agents");
    return res.data.items;
}
export async function fetchPrescriptionTypes() {
    const res = await api.get("/api/prescriptions/types");
    return res.data.items;
}
export async function fetchPatientCard(agentId) {
    const res = await api.get(`/api/prescriptions/patients/${encodeURIComponent(agentId)}/card`);
    return res.data;
}
export async function fetchPendingPrescriptionApprovals() {
    const res = await api.get("/api/prescriptions/approvals/pending");
    return res.data.items;
}
export async function decidePrescriptionApproval(id, decision, notes) {
    const res = await api.post(`/api/prescriptions/${id}/approval`, {
        decision,
        notes,
    });
    return res.data.item;
}
