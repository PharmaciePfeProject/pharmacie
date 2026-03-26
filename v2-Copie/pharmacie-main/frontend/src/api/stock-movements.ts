import { api } from "./axios";
import type { PaginatedResponse } from "@/types/pagination";
import type { StockMovement } from "@/types/stock-movements";

type StockMovementFilters = {
  product_id?: number;
  emplacement_id?: number;
  reference_type_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchStockMovements(filters: StockMovementFilters = {}) {
  const res = await api.get<PaginatedResponse<StockMovement>>("/api/stock-movements", {
    params: filters,
  });
  return res.data;
}

export async function fetchStockMovementById(movementId: number) {
  const res = await api.get<{ item: StockMovement }>(`/api/stock-movements/${movementId}`);
  return res.data.item;
}
