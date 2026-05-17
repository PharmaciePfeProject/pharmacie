import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main() {
  const table = (process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || '').trim().toUpperCase();
  const ownerClause = table ? 'AND OWNER = :owner' : '';
  const binds = table ? { owner: table } : {};

  const result = await dbQuery(
    `SELECT OWNER, TABLE_NAME, COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE
     FROM ALL_TAB_COLUMNS
     WHERE TABLE_NAME = 'APPOINTMENT'
     ${ownerClause}
     ORDER BY COLUMN_ID`,
    binds,
  );

  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
