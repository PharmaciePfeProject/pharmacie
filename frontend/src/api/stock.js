import { api } from "./axios";
export async function fetchStock(filters = {}) {
    const res = await api.get("/api/stock", { params: filters });
    return res.data;
}
export async function fetchStockById(stockId) {
    const res = await api.get(`/api/stock/${stockId}`);
    return res.data.item;
}
export async function fetchStockLots(filters = {}) {
    const res = await api.get("/api/stock-lots", { params: filters });
    return res.data;
}
export async function fetchStockLotById(stockLotId) {
    const res = await api.get(`/api/stock-lots/${stockLotId}`);
    return res.data.item;
}
