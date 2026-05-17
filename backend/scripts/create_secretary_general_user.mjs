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
const SECRETARY_ROLE_ID = Number(process.env.SECRETARY_ROLE_ID || 9);

async function main() {
  const email = process.env.SECRETARY_EMAIL || 'secretaire.general@pharmacie.local';
  const username = process.env.SECRETARY_USERNAME || 'secretaire.general';
  const password = process.env.SECRETARY_PASSWORD || 'Secretaire@12345';
  const firstname = process.env.SECRETARY_FIRSTNAME || 'Secretaire';
  const lastname = process.env.SECRETARY_LASTNAME || 'General';
  const functionName = process.env.SECRETARY_FUNCTION || 'SECRETAIRE_GENERAL';

  const existing = await dbQuery(
    `SELECT ID FROM ${USERS_TABLE} WHERE LOWER(EMAIL) = LOWER(:email) OR LOWER(USERNAME) = LOWER(:username)`,
    { email, username }
  );

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let userId = existing.rows[0]?.ID ?? null;

    if (!userId) {
      userId = await getNextIdWithTableLock(conn, USERS_TABLE);

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
    } else {
      await conn.execute(
        `UPDATE ${USERS_TABLE}
         SET ACTIVED = 1,
             EMAIL = :email,
             FIRSTNAME = :firstname,
             FUNCTION = :functionName,
             LASTNAME = :lastname,
             PASSWORD = :password,
             USERNAME = :username
         WHERE ID = :id`,
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
    }

    const roleCheck = await conn.execute(
      `SELECT COUNT(1) AS CNT FROM ${USER_ROLES_TABLE} WHERE USER_ID = :userId AND ROLES_ID = :roleId`,
      { userId, roleId: SECRETARY_ROLE_ID }
    );

    if (Number(roleCheck.rows?.[0]?.[0] ?? 0) === 0) {
      await conn.execute(
        `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID)
         VALUES (:userId, :roleId)`,
        { userId, roleId: SECRETARY_ROLE_ID },
        { autoCommit: false }
      );
    }

    await conn.commit();

    console.log(existing.rows.length > 0 ? 'Secretary general account updated successfully' : 'Secretary general account created successfully');
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
  console.error('Failed to create secretary general account:', error.message);
  process.exitCode = 1;
});
