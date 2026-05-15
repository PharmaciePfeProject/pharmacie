import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function ensureSecretaryRole() {
  const byName = await dbQuery(
    `SELECT ID, ROLE, DISCRIPTION FROM ROLE
     WHERE UPPER(ROLE) = 'SECRETAIRE_GENERAL'
        OR UPPER(DISCRIPTION) = 'SECRETAIRE GENERAL'`
  );

  if ((byName.rows?.length ?? 0) > 0) {
    const roleId = Number(byName.rows[0].ID);
    if (roleId !== 9) {
      try {
        await dbQuery(`INSERT INTO ROLE (ID, ROLE, DISCRIPTION) VALUES (9, 'SECRETAIRE_GENERAL', 'Secretaire general')`);
        console.log('Created ROLE id=9 for SECRETAIRE_GENERAL');
      } catch (e) {
        if (e?.errorNum !== 1) throw e;
      }
    }
    console.log(`Secretary role already exists (found id=${roleId})`);
    return;
  }

  await dbQuery(`INSERT INTO ROLE (ID, ROLE, DISCRIPTION) VALUES (9, 'SECRETAIRE_GENERAL', 'Secretaire general')`);
  console.log('Created ROLE id=9 for SECRETAIRE_GENERAL');
}

ensureSecretaryRole().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
