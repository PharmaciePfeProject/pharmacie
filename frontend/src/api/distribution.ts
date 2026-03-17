import { api } from "./axios";
import type { PaginatedResponse } from "@/types/pagination";
import type { Distribution } from "@/types/distribution";

type DistributionFilters = {
  product_id?: number;
  district_id?: number;
  emplacement_id?: number;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchDistributions(filters: DistributionFilters = {}) {
  const res = await api.get<PaginatedResponse<Distribution>>("/api/distributions", {
    params: filters,
  });
  return res.data;
}

export async function fetchDistributionById(distributionId: number) {
  const res = await api.get<{ item: Distribution }>(`/api/distributions/${distributionId}`);
  return res.data.item;
}
