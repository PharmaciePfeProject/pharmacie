export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export function parsePageParam(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
}
export function parsePageSizeParam(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE_SIZE;
}
export function createDefaultPagination() {
    return {
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 1,
    };
}
