import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main() {
  try {
    const result = await dbQuery(`
      SELECT COLUMN_NAME
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'ROLE'
      ORDER BY COLUMN_ID
    `);
    console.log(result.rows.map((row) => row.COLUMN_NAME));
  } catch (error) {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  }
}

main();
