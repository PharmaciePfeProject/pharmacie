import { api } from "./axios";
export async function fetchInventories(filters = {}) {
    const res = await api.get("/api/inventories", {
        params: filters,
    });
    return res.data;
}
export async function fetchInventoryById(inventoryId) {
    const res = await api.get(`/api/inventories/${inventoryId}`);
    return res.data.item;
}
