import { api } from "./axios";
import type { Product } from "@/pages/products/product.types";
import type { PaginatedResponse } from "@/types/pagination";

type ProductListParams = {
  search?: string;
  type_id?: number;
  page?: number;
  pageSize?: number;
};

export async function fetchProducts(params: ProductListParams = {}) {
  const res = await api.get<PaginatedResponse<Product>>("/api/products", { params });
  return res.data;
}

export async function fetchProductById(productId: number) {
  const res = await api.get<{ item: Product }>(`/api/products/${productId}`);
  return res.data.item;
}

export async function createProduct(payload: Omit<Product, "product_id">) {
  const res = await api.post<{ item: Product }>("/api/products", payload);
  return res.data.item;
}

export async function updateProduct(productId: number, payload: Omit<Product, "product_id">) {
  const res = await api.put<{ item: Product }>(`/api/products/${productId}`, payload);
  return res.data.item;
}
