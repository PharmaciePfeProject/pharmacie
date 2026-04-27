import { api } from "./axios";
export async function fetchDistributions(filters = {}) {
    const res = await api.get("/api/distributions", {
        params: filters,
    });
    return res.data;
}
export async function fetchDistributionById(distributionId) {
    const res = await api.get(`/api/distributions/${distributionId}`);
    return res.data.item;
}
