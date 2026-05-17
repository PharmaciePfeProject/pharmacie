import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main(){
  try{
    const res = await dbQuery("SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME");
    console.log('TABLES:', res.rows.map(r=>r.TABLE_NAME));
  }catch(e){
    console.error(e);
  }
}

main();
