import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

const tables = ['STOCK_MOVEMENT', 'STOCK_MOVEMENT_LINE', 'MOVEMENT', 'MOVEMENT_LINE', 'DISTRIBUTION', 'DISTRIBUTION_LINE', 'PRESCRIPTION', 'PRESCRIPTION_LINE', 'STOCK'];

async function main(){
  try{
    for(const t of tables){
      try{
        const r = await dbQuery(`SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME='${t}' ORDER BY COLUMN_ID`);
        console.log(t, ':', r.rows.map(x=>x.COLUMN_NAME));
      }catch(e){
        // ignore missing tables
        console.log(t, ': error', e && e.message && e.message.split('\n')[0]);
      }
    }
  }catch(e){
    console.error(e);
  }
}

main();
