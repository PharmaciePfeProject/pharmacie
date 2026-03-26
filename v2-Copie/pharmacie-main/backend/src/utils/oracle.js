/**
 * ============================================
 * UTILITY MODULE: Oracle Database Helpers
 * ============================================
 * 
 * Purpose: Handle Oracle-specific limitations and patterns.
 * 
 * Main Issue Addressed:
 * Oracle SQL has a limit on the number of items in an IN clause.
 * Maximum: 1000 items in WHERE column IN (item1, item2, ..., itemN)
 * 
 * Solution: Split large arrays into chunks, execute multiple queries,
 * then combine the results.
 * 
 * Example Problem:
 *   Bad: WHERE ID IN (1,2,3, ... 5000)  ← Oracle throws error
 *   Good: WHERE ID IN (1,2,...1000)
 *      OR ID IN (1001,...2000)
 *      OR ID IN (2001,...5000)
 */

/**
 * Oracle's maximum limit for items in an IN clause.
 * This is a hard limit set by Oracle Database.
 * Using 1000 to have a safe margin below the actual limit.
 * 
 * @type {number}
 */
export const ORACLE_IN_LIMIT = 1000;

/**
 * Split an array into smaller chunks to respect Oracle's IN clause limit.
 * 
 * Usage Example:
 *   const ids = [1, 2, 3, ..., 5000];
 *   const chunks = chunkValues(ids, 1000);
 *   // Result: [[1,...1000], [1001,...2000], [2001,...5000]]
 * 
 *   Then build multiple SQL queries:
 *   chunks.forEach(chunk => {
 *     // WHERE ID IN (:bindArray) with bind parameters = chunk
 *   });
 * 
 * @param {Array} values - The array to split into chunks
 * @param {number} chunkSize - Size of each chunk (default: 1000, Oracle limit)
 * @returns {Array<Array>} Array of chunks, each containing up to chunkSize items
 */
export function chunkValues(values, chunkSize = ORACLE_IN_LIMIT) {
  const chunks = [];

  // Loop through array in steps of chunkSize
  for (let index = 0; index < values.length; index += chunkSize) {
    // Extract one chunk: from [index] to [index + chunkSize]
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}
