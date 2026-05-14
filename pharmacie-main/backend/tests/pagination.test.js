import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  getPaginationParams,
  buildPaginationMeta,
} from "../src/utils/pagination.js";

describe("pagination utils", () => {
  test("uses defaults when query is invalid", () => {
    const result = getPaginationParams({ page: 0, pageSize: -1 });

    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.offset).toBe(0);
  });

  test("caps pageSize at MAX_PAGE_SIZE", () => {
    const result = getPaginationParams({ page: 2, pageSize: 999 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(MAX_PAGE_SIZE);
    expect(result.offset).toBe(MAX_PAGE_SIZE);
  });

  test("builds pagination metadata with at least one page", () => {
    const meta = buildPaginationMeta({ page: 1, pageSize: 20, total: 0 });

    expect(meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
  });
});
