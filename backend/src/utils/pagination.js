import { dbQuery } from "../config/db.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export function getPaginationParams(query = {}) {
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : DEFAULT_PAGE;
  const pageSize =
    Number.isInteger(query.pageSize) && query.pageSize > 0
      ? Math.min(query.pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function buildPaginationMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function runPaginatedQuery({ baseSql, binds = {}, orderBy, query }) {
  const { page, pageSize, offset } = getPaginationParams(query);

  const countResult = await dbQuery(
    `SELECT COUNT(*) AS TOTAL FROM (${baseSql}) pagination_rows`,
    binds
  );

  const total = Number(countResult.rows[0]?.TOTAL ?? 0);
  const itemsResult = await dbQuery(
    `${baseSql} ${orderBy} OFFSET :offset_rows ROWS FETCH NEXT :fetch_rows ROWS ONLY`,
    {
      ...binds,
      offset_rows: offset,
      fetch_rows: pageSize,
    }
  );

  return {
    items: itemsResult.rows,
    pagination: buildPaginationMeta({ page, pageSize, total }),
  };
}
