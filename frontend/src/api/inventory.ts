import { api } from "./axios";
import type { PaginatedResponse } from "@/types/pagination";
import type { Inventory } from "@/types/inventory";

type InventoryFilters = {
  product_id?: number;
  location_id?: number;
  state_id?: number;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchInventories(filters: InventoryFilters = {}) {
  const res = await api.get<PaginatedResponse<Inventory>>("/api/inventories", {
    params: filters,
  });
  return res.data;
}

export async function fetchInventoryById(inventoryId: number) {
  const res = await api.get<{ item: Inventory }>(`/api/inventories/${inventoryId}`);
  return res.data.item;
}
