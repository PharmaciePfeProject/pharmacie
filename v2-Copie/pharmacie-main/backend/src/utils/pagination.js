/**
 * ============================================
 * UTILITY MODULE: Pagination Helper
 * ============================================
 * 
 * Purpose: Handle pagination for large result sets.
 * Reduces database load and improves API response times by splitting
 * results into manageable pages.
 * 
 * Default Behavior:
 * - Page size: 20 items per page
 * - Maximum page size: 50 items (security limit)
 * - Default page: 1 (first page)
 * 
 * Usage:
 *   const params = getPaginationParams(req.query);
 *   const { page, pageSize, offset } = params;
 *   // Use in SQL: OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
 */

import { dbQuery } from "../config/db.js";

/**
 * Default page number when not specified (starts at page 1).
 * @type {number}
 */
export const DEFAULT_PAGE = 1;

/**
 * Default number of items per page.
 * Used when client doesn't specify or specifies invalid pageSize.
 * @type {number}
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum number of items allowed per page (security limit).
 * Prevents clients from requesting massive pages that could overload the server.
 * @type {number}
 */
export const MAX_PAGE_SIZE = 50;

/**
 * Extract and validate pagination parameters from query string.
 * Ensures page and pageSize are positive integers within acceptable limits.
 * 
 * Input Validation:
 * - If page < 1 or not integer: use DEFAULT_PAGE (1)
 * - If pageSize > MAX_PAGE_SIZE: limit to MAX_PAGE_SIZE (50)
 * - If pageSize < 1 or not integer: use DEFAULT_PAGE_SIZE (20)
 * 
 * Parameters:
 * - query.page: Desired page number (e.g., 1, 2, 3)
 * - query.pageSize: Items per page (e.g., 10, 20, 50)
 * 
 * @param {Object} query - Query parameters from request (e.g., req.query)
 * @returns {Object} Validated pagination: { page, pageSize, offset }
 * 
 * Example Return:
 *   { page: 2, pageSize: 20, offset: 20 }
 *   This means: start from item 21, return 20 items
 */
export function getPaginationParams(query = {}) {
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : DEFAULT_PAGE;
  const pageSize =
    Number.isInteger(query.pageSize) && query.pageSize > 0
      ? Math.min(query.pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    // Calculate starting position: offset = (page - 1) * pageSize
    // Page 1: offset = 0 (items 1-20)
    // Page 2: offset = 20 (items 21-40)
    offset: (page - 1) * pageSize,
  };
}

/**
 * Build pagination metadata for API response.
 * Includes total items and total pages for frontend navigation.
 * 
 * @param {Object} meta - Contains page, pageSize, and total item count
 * @param {number} meta.page - Current page number
 * @param {number} meta.pageSize - Items per page
 * @param {number} meta.total - Total items in entire dataset
 * @returns {Object} Pagination metadata with all computed values
 * 
 * Example Return:
 *   {
 *     page: 1,
 *     pageSize: 20,
 *     total: 150,         // 150 items total
 *     totalPages: 8       // 150 / 20 = 7.5 → 8 pages
 *   }
 */
export function buildPaginationMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    // Calculate total pages: ceil(total / pageSize)
    // Minimum 1 page even if total = 0
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Execute a paginated query with automatic count and limit/offset.
 * Handles the two-query pattern: COUNT(*) then actual data with OFFSET/FETCH.
 * 
 * Process:
 * 1. Run COUNT query to get total items
 * 2. Run data query with OFFSET/FETCH to get one page
 * 3. Return items + pagination metadata
 * 
 * @param {Object} config - Query configuration
 * @param {string} config.baseSql - Base SQL SELECT statement (without pagination clauses)
 * @param {Object} config.binds - Bind variables for SQL (query parameters)
 * @param {string} config.orderBy - ORDER BY clause (e.g., "ORDER BY ID DESC")
 * @param {Object} config.query - Query string params with page/pageSize
 * @returns {Promise<Object>} { items: Array, pagination: Object }
 * 
 * Example Usage:
 *   const result = await runPaginatedQuery({
 *     baseSql: 'SELECT * FROM PRODUCTS WHERE category = :category',
 *     binds: { category: 'Medicine' },
 *     orderBy: 'ORDER BY NAME ASC',
 *     query: req.query  // May contain ?page=2&pageSize=20
 *   });
 */
export async function runPaginatedQuery({ baseSql, binds = {}, orderBy, query }) {
  const { page, pageSize, offset } = getPaginationParams(query);

  // Step 1: Get total count of matching rows
  const countResult = await dbQuery(
    `SELECT COUNT(*) AS TOTAL FROM (${baseSql}) pagination_rows`,
    binds
  );

  const total = Number(countResult.rows[0]?.TOTAL ?? 0);

  // Step 2: Get one page of data with OFFSET and FETCH (Oracle OFFSET/FETCH syntax)
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
