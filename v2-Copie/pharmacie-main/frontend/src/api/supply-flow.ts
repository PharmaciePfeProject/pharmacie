import { api } from "./axios";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  ExternalOrder,
  InternalDelivery,
  InternalOrder,
  Reception,
} from "@/types/supply-flow";

export async function fetchExternalOrders(params: Record<string, string | number | undefined> = {}) {
  const res = await api.get<PaginatedResponse<ExternalOrder>>("/api/external-orders", { params });
  return res.data;
}

export async function fetchExternalOrderById(id: number) {
  const res = await api.get<{ item: ExternalOrder }>(`/api/external-orders/${id}`);
  return res.data.item;
}

export async function fetchInternalOrders(params: Record<string, string | number | undefined> = {}) {
  const res = await api.get<PaginatedResponse<InternalOrder>>("/api/internal-orders", { params });
  return res.data;
}

export async function fetchInternalOrderById(id: number) {
  const res = await api.get<{ item: InternalOrder }>(`/api/internal-orders/${id}`);
  return res.data.item;
}

export async function fetchReceptions(params: Record<string, string | number | undefined> = {}) {
  const res = await api.get<PaginatedResponse<Reception>>("/api/receptions", { params });
  return res.data;
}

export async function fetchReceptionById(id: number) {
  const res = await api.get<{ item: Reception }>(`/api/receptions/${id}`);
  return res.data.item;
}

export async function fetchInternalDeliveries(params: Record<string, string | number | undefined> = {}) {
  const res = await api.get<PaginatedResponse<InternalDelivery>>("/api/internal-deliveries", { params });
  return res.data;
}

export async function fetchInternalDeliveryById(id: number) {
  const res = await api.get<{ item: InternalDelivery }>(`/api/internal-deliveries/${id}`);
  return res.data.item;
}
