import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

const queries = [
  [
    'PRESCRIPTION constraints',
    `SELECT c.constraint_name, c.constraint_type, c.table_name, cc.column_name, c.r_constraint_name
     FROM user_constraints c
     JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name
     WHERE c.table_name = 'PRESCRIPTION'
     ORDER BY c.constraint_type, c.constraint_name, cc.position`,
  ],
  [
    'Tables with AGENT in name',
    `SELECT table_name
     FROM user_tables
     WHERE UPPER(table_name) LIKE '%AGENT%'
     ORDER BY table_name`,
  ],
  [
    'Columns containing AGENT',
    `SELECT table_name, column_name
     FROM user_tab_columns
     WHERE UPPER(column_name) LIKE '%AGENT%'
     ORDER BY table_name, column_id`,
  ],
  [
    'FKs touching AGENT_ID',
    `SELECT c.constraint_name, c.table_name, cc.column_name, c.r_constraint_name
     FROM user_constraints c
     JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name
     WHERE c.constraint_type = 'R' AND UPPER(cc.column_name) = 'AGENT_ID'
     ORDER BY c.table_name`,
  ],
  [
    'DIM_PRESCRIPTION columns',
    `SELECT column_name
     FROM user_tab_columns
     WHERE table_name = 'DIM_PRESCRIPTION'
     ORDER BY column_id`,
  ],
  [
    'DIM_PRESCRIPTION constraints',
    `SELECT c.constraint_name, c.constraint_type, c.table_name, cc.column_name, c.r_constraint_name
     FROM user_constraints c
     JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name
     WHERE c.table_name = 'DIM_PRESCRIPTION'
     ORDER BY c.constraint_type, c.constraint_name, cc.position`,
  ],
];

for (const [title, sql] of queries) {
  const res = await dbQuery(sql);
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(res.rows, null, 2));
}
