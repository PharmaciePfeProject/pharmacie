import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main(){
  try{
    const res = await dbQuery("SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME='STOCK' ORDER BY COLUMN_ID");
    console.log('STOCK columns:', res.rows.map(r=>r.COLUMN_NAME));
  }catch(e){
    console.error(e);
  }
}

main();
