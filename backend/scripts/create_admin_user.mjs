import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb, dbQuery } from '../src/config/db.js';
import { getNextIdWithTableLock } from '../src/utils/oracleIds.js';

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
  const firstname = process.env.ADMIN_FIRSTNAME || 'Admin';
  const lastname = process.env.ADMIN_LASTNAME || 'User';
  const functionName = process.env.ADMIN_FUNCTION || 'ADMIN';

  const existing = await dbQuery(
    `SELECT ID FROM ${USERS_TABLE} WHERE LOWER(EMAIL) = LOWER(:email) OR LOWER(USERNAME) = LOWER(:username)`,
    { email, username }
  );

  if (existing.rows.length > 0) {
    console.log(`Admin account already exists: ${username} / ${email}`);
    return;
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const userId = await getNextIdWithTableLock(conn, USERS_TABLE);
    const hashedPassword = await bcrypt.hash(password, 10);

    await conn.execute(
      `INSERT INTO ${USERS_TABLE} (ID, ACTIVED, EMAIL, FIRSTNAME, FUNCTION, LASTNAME, PASSWORD, USERNAME)
       VALUES (:id, 1, :email, :firstname, :functionName, :lastname, :password, :username)`,
      {
        id: userId,
        email,
        firstname,
        functionName,
        lastname,
        password: hashedPassword,
        username,
      },
      { autoCommit: false }
    );

    await conn.execute(
      `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID)
       VALUES (:userId, :roleId)`,
      { userId, roleId: ADMIN_ROLE_ID },
      { autoCommit: false }
    );

    await conn.commit();

    console.log('Admin account created successfully');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Temporary password: ${password}`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}

main().catch((error) => {
  console.error('Failed to create admin account:', error.message);
  process.exitCode = 1;
});
