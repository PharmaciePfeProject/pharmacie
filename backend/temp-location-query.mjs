import "dotenv/config";
import { dbQuery } from "./src/config/db.js";
const res = await dbQuery("SELECT ID, LIB FROM LOCATION FETCH FIRST 20 ROWS ONLY");
console.log(JSON.stringify(res.rows, null, 2));
