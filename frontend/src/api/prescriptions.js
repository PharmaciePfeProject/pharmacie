import { api } from "./axios";
export async function fetchPrescriptions(filters = {}) {
    const res = await api.get("/api/prescriptions", {
        params: filters,
    });
    return res.data;
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
