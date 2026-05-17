import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main(){
  try{
    const res = await dbQuery("SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME='DOCTOR' ORDER BY COLUMN_ID");
    console.log('DOCTOR columns:', res.rows.map(r=>r.COLUMN_NAME));
  }catch(e){
    console.error(e);
  }
}

main();
