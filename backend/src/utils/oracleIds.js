export async function getNextIdWithTableLock(conn, tableName) {
  await conn.execute(`LOCK TABLE ${tableName} IN EXCLUSIVE MODE`);
  const result = await conn.execute(`SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${tableName}`);
  return Number(result.rows[0].NEXT_ID);
}
