import { api } from "./axios";
export async function fetchStockMovements(filters = {}) {
    const res = await api.get("/api/stock-movements", {
        params: filters,
    });
    return res.data;
}
export async function fetchStockMovementById(movementId) {
    const res = await api.get(`/api/stock-movements/${movementId}`);
    return res.data.item;
}
