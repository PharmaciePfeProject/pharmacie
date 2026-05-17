import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main() {
  const existing = await dbQuery(`SELECT ID FROM APPOINTMENT ORDER BY ID DESC FETCH FIRST 1 ROWS ONLY`);
  const id = existing.rows?.[0]?.ID;

  if (!id) {
    console.log('No appointment row to test update');
    return;
  }

  const sql = `UPDATE APPOINTMENT
     SET UPDATED_AT = SYSTIMESTAMP,
         UPDATED_BY_USER_ID = :updated_by_user_id,
         STATUS = :status,
         NOTES = :notes
     WHERE ID = :id`;

  const binds = {
    id,
    updated_by_user_id: 5379898,
    status: 'RESCHEDULED',
    notes: 'debug update test',
  };

  console.log('Testing SQL with binds:', binds);
  const res = await dbQuery(sql, binds);
  console.log('Update result:', res.rowsAffected);

  const check = await dbQuery('SELECT ID, STATUS, NOTES, UPDATED_BY_USER_ID FROM APPOINTMENT WHERE ID = :id', { id });
  console.log(JSON.stringify(check.rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
