import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb, dbQuery } from '../src/config/db.js';

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || '';
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const USERS_TABLE = withSchema('UTILISATEUR');
const USER_ROLES_TABLE = withSchema('UTILISATEUR_ROLE');
const ADMIN_ROLE_ID = 1;

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@pharmacie.local';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const userRes = await dbQuery(
    `SELECT ID, EMAIL, USERNAME FROM ${USERS_TABLE}
     WHERE LOWER(EMAIL) = LOWER(:email) OR LOWER(USERNAME) = LOWER(:username)`,
    { email, username }
  );

  if (userRes.rows.length === 0) {
    throw new Error(`No user found for ${username} / ${email}`);
  }

  const userId = userRes.rows[0].ID;
  const hashedPassword = await bcrypt.hash(password, 10);

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    await conn.execute(
      `UPDATE ${USERS_TABLE} SET PASSWORD = :password, ACTIVED = 1 WHERE ID = :id`,
      { password: hashedPassword, id: userId },
      { autoCommit: false }
    );

    await conn.execute(
      `MERGE INTO ${USER_ROLES_TABLE} ur
       USING (SELECT :userId AS USER_ID, :roleId AS ROLES_ID FROM dual) src
       ON (ur.USER_ID = src.USER_ID AND ur.ROLES_ID = src.ROLES_ID)
       WHEN NOT MATCHED THEN
         INSERT (USER_ID, ROLES_ID) VALUES (src.USER_ID, src.ROLES_ID)`,
      { userId, roleId: ADMIN_ROLE_ID },
      { autoCommit: false }
    );

    await conn.commit();

    console.log('Admin account reset successfully');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}

main().catch((error) => {
  console.error('Failed to reset admin account:', error.message);
  process.exitCode = 1;
});
