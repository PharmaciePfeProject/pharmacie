export const ORACLE_IN_LIMIT = 1000;

export function chunkValues(values, chunkSize = ORACLE_IN_LIMIT) {
  const chunks = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}
