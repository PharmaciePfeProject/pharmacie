import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

const wanted = ['AGENT','APPOINTMENT','APPOINTMENT_BLOCK','APPOINTMENT_RESCHEDULE_REQUEST'];
const result = await dbQuery(`SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME IN ('AGENT','APPOINTMENT','APPOINTMENT_BLOCK','APPOINTMENT_RESCHEDULE_REQUEST') ORDER BY TABLE_NAME`);
console.log(JSON.stringify(result.rows.map(r => r.TABLE_NAME)));
setTimeout(() => process.exit(0), 100);
