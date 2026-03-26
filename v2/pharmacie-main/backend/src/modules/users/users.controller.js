import { initDb, dbQuery } from "../../config/db.js";
import { buildAccessFromRoleIds, getRoleIdsFromKeys, listAssignableRoles } from "../../utils/rbac.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const USERS_TABLE = withSchema("UTILISATEUR");
const USER_ROLES_TABLE = withSchema("UTILISATEUR_ROLE");

function shapeUser(user, roleIds) {
  const access = buildAccessFromRoleIds(roleIds);

  return {
    id: user.ID,
    email: user.EMAIL,
    username: user.USERNAME,
    firstname: user.FIRSTNAME,
    lastname: user.LASTNAME,
    function: user.FUNCTION,
    functionName: user.FUNCTION,
    actived: user.ACTIVED,
    roleIds: access.roleIds,
    roles: access.roles,
    permissions: access.permissions,
  };
}

async function getRoleIdsByUserIds(userIds) {
  if (userIds.length === 0) {
    return new Map();
  }

  const bindNames = userIds.map((_, index) => `id${index}`);
  const binds = Object.fromEntries(bindNames.map((bindName, index) => [bindName, userIds[index]]));
  const result = await dbQuery(
    `SELECT USER_ID, ROLES_ID
     FROM ${USER_ROLES_TABLE}
     WHERE USER_ID IN (${bindNames.map((bindName) => `:${bindName}`).join(", ")})`,
    binds
  );

  const roleIdsByUserId = new Map();
  for (const row of result.rows) {
    const current = roleIdsByUserId.get(row.USER_ID) || [];
    current.push(row.ROLES_ID);
    roleIdsByUserId.set(row.USER_ID, current);
  }

  return roleIdsByUserId;
}

export async function listUsers(req, res) {
  const usersRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     ORDER BY ID`
  );

  const users = usersRes.rows;
  const roleIdsByUserId = await getRoleIdsByUserIds(users.map((user) => user.ID));

  return res.json({
    items: users.map((user) => shapeUser(user, roleIdsByUserId.get(user.ID) || [])),
    availableRoles: listAssignableRoles(),
  });
}

export async function updateUserRoles(req, res) {
  const userId = req.params.id;
  const roleIds = getRoleIdsFromKeys(req.body.roles);

  const userRes = await dbQuery(`SELECT ID FROM ${USERS_TABLE} WHERE ID = :id`, { id: userId });
  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    await conn.execute(`DELETE FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`, { id: userId }, { autoCommit: false });

    for (const roleId of roleIds) {
      await conn.execute(
        `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID) VALUES (:userId, :roleId)`,
        { userId, roleId },
        { autoCommit: false }
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const updatedUserRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId }
  );

  return res.json({
    user: shapeUser(updatedUserRes.rows[0], roleIds),
  });
}
