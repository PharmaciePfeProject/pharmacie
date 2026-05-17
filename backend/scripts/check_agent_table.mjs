import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main() {
  try {
    const userTable = await dbQuery("SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME='AGENT'");
    const allTable = await dbQuery("SELECT OWNER, TABLE_NAME FROM ALL_TABLES WHERE TABLE_NAME='AGENT' ORDER BY OWNER");

    console.log('USER_TABLES AGENT rows:', userTable.rows);
    console.log('ALL_TABLES AGENT rows:', allTable.rows);
  } catch (e) {
    console.error('Check failed:', e.message);
    process.exitCode = 1;
  }
}

main();
