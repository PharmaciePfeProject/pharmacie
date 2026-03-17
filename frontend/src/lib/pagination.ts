import type { PaginationMeta } from "@/types/pagination";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

export function parsePageParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
}

export function parsePageSizeParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE_SIZE;
}

export function createDefaultPagination(): PaginationMeta {
  return {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
}
