import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function main() {
  try {
    const result = await dbQuery(`
      SELECT u.ID, u.EMAIL, u.USERNAME, u.FIRSTNAME, u.LASTNAME, u.FUNCTION
      FROM UTILISATEUR u
      JOIN UTILISATEUR_ROLE ur ON ur.USER_ID = u.ID
      JOIN ROLE r ON r.ID = ur.ROLES_ID
      WHERE UPPER(r.ROLE) = 'ADMIN'
      ORDER BY u.ID
    `);

    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  }
}

main();
