import { api } from "./axios";
import type { PaginatedResponse } from "@/types/pagination";
import type { StockLotRecord, StockRecord } from "@/types/stock";

type StockFilters = {
  product_id?: number;
  emplacement_id?: number;
  page?: number;
  pageSize?: number;
};

type StockLotFilters = StockFilters & {
  lot_id?: number;
};

export async function fetchStock(filters: StockFilters = {}) {
  const res = await api.get<PaginatedResponse<StockRecord>>("/api/stock", { params: filters });
  return res.data;
}

export async function fetchStockById(stockId: number) {
  const res = await api.get<{ item: StockRecord }>(`/api/stock/${stockId}`);
  return res.data.item;
}

export async function fetchStockLots(filters: StockLotFilters = {}) {
  const res = await api.get<PaginatedResponse<StockLotRecord>>("/api/stock-lots", { params: filters });
  return res.data;
}

export async function fetchStockLotById(stockLotId: number) {
  const res = await api.get<{ item: StockLotRecord }>(`/api/stock-lots/${stockLotId}`);
  return res.data.item;
}
