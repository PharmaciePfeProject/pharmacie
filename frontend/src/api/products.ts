import { api } from "./axios";
import type { Product } from "@/pages/products/product.types";
import type { PaginatedResponse } from "@/types/pagination";

type ProductListParams = {
  search?: string;
  type_id?: number;
  page?: number;
  pageSize?: number;
};

function normalizeProduct(raw: any): Product {
  return {
    product_id: raw?.product_id ?? raw?.PRODUCT_ID ?? null,
    lib: raw?.lib ?? raw?.LIB ?? null,
    bar_code: raw?.bar_code ?? raw?.BAR_CODE ?? null,
    price: raw?.price ?? raw?.PRICE ?? null,
    vat_rate: raw?.vat_rate ?? raw?.VAT_RATE ?? null,
    wau_cost: raw?.wau_cost ?? raw?.WAU_COST ?? null,
    min_stock: raw?.min_stock ?? raw?.MIN_STOCK ?? null,
    safety_stock: raw?.safety_stock ?? raw?.SAFETY_STOCK ?? null,
    warning_stock: raw?.warning_stock ?? raw?.WARNING_STOCK ?? null,
    dci: raw?.dci ?? raw?.DCI ?? null,
    pharma_class_id: raw?.pharma_class_id ?? raw?.PHARMA_CLASS_ID ?? null,
    type_id: raw?.type_id ?? raw?.TYPE_ID ?? null,
  };
}

export async function fetchProducts(params: ProductListParams = {}) {
  const res = await api.get<PaginatedResponse<Product>>("/api/products", { params });
  return {
    ...res.data,
    items: (res.data.items || []).map(normalizeProduct),
  };
}

export async function fetchProductById(productId: number) {
  const res = await api.get<{ item: Product }>(`/api/products/${productId}`);
  return normalizeProduct(res.data.item);
}

export async function createProduct(payload: Omit<Product, "product_id">) {
  const res = await api.post<{ item: Product }>("/api/products", payload);
  return normalizeProduct(res.data.item);
}

export async function updateProduct(productId: number, payload: Omit<Product, "product_id">) {
  const res = await api.put<{ item: Product }>(`/api/products/${productId}`, payload);
  return normalizeProduct(res.data.item);
}
