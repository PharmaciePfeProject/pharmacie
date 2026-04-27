import oracledb from "oracledb";
import "dotenv/config";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

export async function initDb() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });
  return pool;
}

export async function dbQuery(sql, binds = {}, options = {}) {
  const p = await initDb();
  const conn = await p.getConnection();
  try {
    const res = await conn.execute(sql, binds, { autoCommit: true, ...options });
    return res;
  } finally {
    await conn.close();
  }
}