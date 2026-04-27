import { initDb, dbQuery } from "../../config/db.js";
import bcrypt from "bcryptjs";
import {
  buildAccessFromRoleIds,
  getRoleIdsFromKeys,
  listAssignableRoles,
  ROLE_KEYS,
} from "../../utils/rbac.js";
import { ensureDoctorProfileForName } from "../../utils/doctorProfiles.js";
import { getNextIdWithTableLock } from "../../utils/oracleIds.js";
import {
  clearAssignedDepot,
  ensurePharmacistDepotTable,
  getAssignedDepotMap,
  getAssignedDepotByUserId,
  setAssignedDepot,
} from "../../utils/pharmacistDepots.js";
import { findDoctorByExactName } from "../../utils/doctorProfiles.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const USERS_TABLE = withSchema("UTILISATEUR");
const USER_ROLES_TABLE = withSchema("UTILISATEUR_ROLE");
const LOCATION_TABLE = withSchema("LOCATION");

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function shapeUser(user, roleIds, assignedDepot = null, doctorSpecialty = null) {
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
    assignedDepotId: assignedDepot?.locationId || null,
    assignedDepotLabel: assignedDepot?.locationLabel || null,
    doctorSpecialty,
    roleIds: access.roleIds,
    roles: access.roles,
    permissions: access.permissions,
  };
}

async function getDoctorSpecialtyByUserName(firstname, lastname) {
  const doctor = await findDoctorByExactName(`${firstname} ${lastname}`, { activeOnly: false });
  return doctor?.specialty || null;
}

async function getRoleIdsByUserIds(userIds) {
  if (userIds.length === 0) {
    return new Map();
  }

  const bindNames = userIds.map((_, index) => `id${index}`);
  const binds = Object.fromEntries(
    bindNames.map((bindName, index) => [bindName, userIds[index]]),
  );
  const result = await dbQuery(
    `SELECT USER_ID, ROLES_ID
     FROM ${USER_ROLES_TABLE}
     WHERE USER_ID IN (${bindNames.map((bindName) => `:${bindName}`).join(", ")})`,
    binds,
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
  await ensurePharmacistDepotTable();

  const usersRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     ORDER BY ID`,
  );

  const users = usersRes.rows;
  const roleIdsByUserId = await getRoleIdsByUserIds(
    users.map((user) => user.ID),
  );
  const assignedDepotByUserId = await getAssignedDepotMap(
    users.map((user) => user.ID),
  );
  const doctorSpecialties = new Map();

  for (const user of users) {
    try {
      const specialty = await getDoctorSpecialtyByUserName(user.FIRSTNAME, user.LASTNAME);
      doctorSpecialties.set(user.ID, specialty);
    } catch {
      doctorSpecialties.set(user.ID, null);
    }
  }

  return res.json({
    items: users.map((user) =>
      shapeUser(
        user,
        roleIdsByUserId.get(user.ID) || [],
        assignedDepotByUserId.get(user.ID) || null,
        doctorSpecialties.get(user.ID) || null,
      ),
    ),
    availableRoles: listAssignableRoles(),
  });
}

export async function updateManagedUser(req, res) {
  const userId = Number(req.params.id);
  const firstname = normalizeOptionalString(req.body.firstname);
  const lastname = normalizeOptionalString(req.body.lastname);
  const email = normalizeOptionalString(req.body.email)?.toLowerCase();
  const username = normalizeOptionalString(req.body.username);
  const functionName = req.body.functionName === null
    ? null
    : normalizeOptionalString(req.body.functionName);
  const doctorSpecialty = req.body.doctorSpecialty === null
    ? null
    : normalizeOptionalString(req.body.doctorSpecialty);
  const assignedLocationId =
    req.body.assignedLocationId === null || req.body.assignedLocationId === undefined
      ? null
      : Number(req.body.assignedLocationId);

  const existingUser = await dbQuery(
    `SELECT ID
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );

  if (existingUser.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  if (email || username) {
    const duplicateRes = await dbQuery(
      `SELECT ID
       FROM ${USERS_TABLE}
       WHERE ID != :id
         AND (
           (:email IS NOT NULL AND LOWER(EMAIL) = LOWER(:email))
           OR (:username IS NOT NULL AND LOWER(USERNAME) = LOWER(:username))
         )`,
      { id: userId, email: email || null, username: username || null },
    );

    if (duplicateRes.rows.length > 0) {
      return res.status(409).json({ message: "Email or username already used" });
    }
  }

  await dbQuery(
    `UPDATE ${USERS_TABLE}
     SET EMAIL = COALESCE(:email, EMAIL),
         USERNAME = COALESCE(:username, USERNAME),
         FIRSTNAME = COALESCE(:firstname, FIRSTNAME),
         LASTNAME = COALESCE(:lastname, LASTNAME),
         FUNCTION = CASE
           WHEN :functionMarker = 1 THEN :functionName
           ELSE FUNCTION
         END
     WHERE ID = :id`,
    {
      id: userId,
      email: email || null,
      username: username || null,
      firstname: firstname || null,
      lastname: lastname || null,
      functionMarker: req.body.functionName === undefined ? 0 : 1,
      functionName,
    },
  );

  if (req.body.doctorSpecialty !== undefined) {
    await ensureDoctorProfileForName(
      {
        firstname: firstname || (updatedUserRes?.rows?.[0]?.FIRSTNAME ?? null),
        lastname: lastname || (updatedUserRes?.rows?.[0]?.LASTNAME ?? null),
        specialty: doctorSpecialty,
      },
      null,
    );
  }

  if (req.body.assignedLocationId !== undefined || req.body.functionName !== undefined) {
    const currentUserRes = await dbQuery(
      `SELECT ID, FIRSTNAME, LASTNAME, FUNCTION
       FROM ${USERS_TABLE}
       WHERE ID = :id`,
      { id: userId },
    );

    const currentFunction = String(currentUserRes.rows[0]?.FUNCTION || "").trim().toUpperCase();
    const nextFunction = String(functionName || currentFunction || "").trim().toUpperCase();

    const existingDepot = await getAssignedDepotByUserId(userId);

    if (nextFunction === "DEPOT") {
      if (!assignedLocationId) {
        return res.status(400).json({ message: "Depot is required when pharmacist function is DEPOT" });
      }

      const pool = await initDb();
      const conn = await pool.getConnection();
      try {
        await setAssignedDepot(conn, {
          userId,
          locationId: assignedLocationId,
          assignedByUserId: req.user?.sub,
        });
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        await conn.close();
      }
    } else if (nextFunction === "PRESCRIPTIONS") {
      if (existingDepot) {
        const pool = await initDb();
        const conn = await pool.getConnection();
        try {
          await clearAssignedDepot(conn, userId);
          await conn.commit();
        } catch (error) {
          await conn.rollback();
          throw error;
        } finally {
          await conn.close();
        }
      }
    }
  }

  const updatedUserRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );

  if (req.body.doctorSpecialty !== undefined) {
    await ensureDoctorProfileForName(
      {
        firstname: updatedUserRes.rows[0].FIRSTNAME,
        lastname: updatedUserRes.rows[0].LASTNAME,
        specialty: doctorSpecialty,
      },
      null,
    );
  }

  if (req.body.functionName !== undefined || req.body.assignedLocationId !== undefined) {
    const nextFunction = String(updatedUserRes.rows[0].FUNCTION || "").trim().toUpperCase();
    const existingDepot = await getAssignedDepotByUserId(userId);

    if (nextFunction === "DEPOT") {
      if (assignedLocationId !== null && assignedLocationId !== undefined) {
        const pool = await initDb();
        const conn = await pool.getConnection();
        try {
          await setAssignedDepot(conn, {
            userId,
            locationId: assignedLocationId,
            assignedByUserId: req.user?.sub,
          });
          await conn.commit();
        } catch (error) {
          await conn.rollback();
          throw error;
        } finally {
          await conn.close();
        }
      } else if (!existingDepot) {
        return res.status(400).json({ message: "Depot is required when pharmacist function is DEPOT" });
      }
    } else if (req.body.functionName !== undefined && existingDepot) {
      const pool = await initDb();
      const conn = await pool.getConnection();
      try {
        await clearAssignedDepot(conn, userId);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        await conn.close();
      }
    }
  }

  const roleIds = await getRoleIdsByUserIds([userId]);
  const assignedDepot = await getAssignedDepotMap([userId]);
  const specialty = await getDoctorSpecialtyByUserName(
    updatedUserRes.rows[0].FIRSTNAME,
    updatedUserRes.rows[0].LASTNAME,
  ).catch(() => null);

  return res.json({
    user: shapeUser(
      updatedUserRes.rows[0],
      roleIds.get(userId) || [],
      assignedDepot.get(userId) || null,
      specialty,
    ),
  });
}

export async function updateUserStatus(req, res) {
  const userId = Number(req.params.id);
  const actived = Number(req.body.actived);
  const requesterId = Number(req.user?.sub);

  if (requesterId === userId && actived === 0) {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }

  const updated = await dbQuery(
    `UPDATE ${USERS_TABLE}
     SET ACTIVED = :actived
     WHERE ID = :id`,
    { id: userId, actived },
  );

  if (!updated?.rowsAffected) {
    return res.status(404).json({ message: "User not found" });
  }

  const updatedUserRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );
  const roleIds = await getRoleIdsByUserIds([userId]);
  const assignedDepot = await getAssignedDepotMap([userId]);

  return res.json({
    user: shapeUser(
      updatedUserRes.rows[0],
      roleIds.get(userId) || [],
      assignedDepot.get(userId) || null,
    ),
  });
}

export async function deleteManagedUser(req, res) {
  const userId = Number(req.params.id);
  const requesterId = Number(req.user?.sub);

  if (requesterId === userId) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const existingUser = await dbQuery(
    `SELECT ID FROM ${USERS_TABLE} WHERE ID = :id`,
    { id: userId },
  );

  if (existingUser.rows.length === 0) {
    return res.status(200).json({
      deleted: true,
      alreadyMissing: true,
      message: "User already deleted or not found",
    });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    try {
      await clearAssignedDepot(conn, userId);
    } catch (depotError) {
      // Depot assignment cleanup is optional for delete flow.
      // If the table is missing or cannot be managed in this environment,
      // continue with user delete/deactivation logic.
      if (depotError?.errorNum !== 942 && depotError?.errorNum !== 1031) {
        throw depotError;
      }
    }

    await conn.execute(
      `DELETE FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`,
      { id: userId },
      { autoCommit: false },
    );

    await conn.execute(
      `DELETE FROM ${USERS_TABLE} WHERE ID = :id`,
      { id: userId },
      { autoCommit: false },
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();

    // Fallback to soft-delete when hard delete is blocked by Oracle constraints
    // or missing delete privilege in this environment.
    if (error?.errorNum === 2292 || error?.errorNum === 1031 || error?.errorNum === 942) {
      const updated = await dbQuery(
        `UPDATE ${USERS_TABLE}
         SET ACTIVED = 0
         WHERE ID = :id`,
        { id: userId },
      );

      if (!updated?.rowsAffected) {
        return res.status(200).json({
          deleted: true,
          alreadyMissing: true,
          message: "User already deleted or not found",
        });
      }

      const updatedUserRes = await dbQuery(
        `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
         FROM ${USERS_TABLE}
         WHERE ID = :id`,
        { id: userId },
      );
      const roleIds = await getRoleIdsByUserIds([userId]);
      const assignedDepot = await getAssignedDepotMap([userId]);

      return res.status(200).json({
        deleted: false,
        deactivated: true,
        message: "User could not be hard deleted and was deactivated instead",
        user: shapeUser(
          updatedUserRes.rows[0],
          roleIds.get(userId) || [],
          assignedDepot.get(userId) || null,
        ),
      });
    }

    throw error;
  } finally {
    await conn.close();
  }

  return res.status(200).json({ deleted: true });
}

export async function updateUserRoles(req, res) {
  const userId = req.params.id;
  const roleIds = getRoleIdsFromKeys(req.body.roles);

  const userRes = await dbQuery(
    `SELECT ID FROM ${USERS_TABLE} WHERE ID = :id`,
    { id: userId },
  );
  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    await conn.execute(
      `DELETE FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`,
      { id: userId },
      { autoCommit: false },
    );

    for (const roleId of roleIds) {
      await conn.execute(
        `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID) VALUES (:userId, :roleId)`,
        { userId, roleId },
        { autoCommit: false },
      );
    }

    if (!roleIds.includes(2)) {
      await clearAssignedDepot(conn, userId);
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
    { id: userId },
  );
  const assignedDepot = await getAssignedDepotMap([Number(userId)]);

  return res.json({
    user: shapeUser(
      updatedUserRes.rows[0],
      roleIds,
      assignedDepot.get(Number(userId)) || null,
    ),
  });
}

function resolveFunctionName(roleKey, providedFunctionName) {
  if (providedFunctionName) {
    if (roleKey === ROLE_KEYS.PHARMACIEN) {
      return String(providedFunctionName).trim().toUpperCase();
    }

    return providedFunctionName;
  }

  if (roleKey === ROLE_KEYS.MEDECIN) return "DOCTOR";
  if (roleKey === ROLE_KEYS.PHARMACIEN) return "PHARMACIST";
  if (roleKey === ROLE_KEYS.RESPONSABLE_REPORTING) return "REPORTING";
  return null;
}

export async function createManagedUser(req, res) {
  const {
    email,
    username,
    password,
    firstname,
    lastname,
    role,
    functionName: rawFunctionName,
    doctorSpecialty,
    assignedLocationId,
  } = req.body;
  const functionName = resolveFunctionName(role, rawFunctionName);
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();
  const normalizedFirstname = String(firstname).trim();
  const normalizedLastname = String(lastname).trim();

  const existing = await dbQuery(
    `SELECT ID
     FROM ${USERS_TABLE}
     WHERE LOWER(EMAIL) = LOWER(:email)
         OR LOWER(USERNAME) = LOWER(:username)`,
    { email: normalizedEmail, username: normalizedUsername },
  );

  if (existing.rows.length > 0) {
    return res.status(409).json({ message: "Email or username already used" });
  }

  const roleIds = getRoleIdsFromKeys([role]);
  if (roleIds.length === 0) {
    return res.status(500).json({ message: "Role mapping is not configured" });
  }

  const roleId = roleIds[0];

  const hashedPassword = await bcrypt.hash(password, 10);

  const pool = await initDb();
  const conn = await pool.getConnection();
  let userId;

  try {
    userId = await getNextIdWithTableLock(conn, USERS_TABLE);

    await conn.execute(
      `INSERT INTO ${USERS_TABLE} (ID, ACTIVED, EMAIL, FIRSTNAME, FUNCTION, LASTNAME, PASSWORD, USERNAME)
       VALUES (:id, 1, :email, :firstname, :functionName, :lastname, :password, :username)`,
      {
        id: userId,
        email: normalizedEmail,
        firstname: normalizedFirstname,
        functionName,
        lastname: normalizedLastname,
        password: hashedPassword,
        username: normalizedUsername,
      },
      { autoCommit: false },
    );

    await conn.execute(
      `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID)
       VALUES (:userId, :roleId)`,
      { userId, roleId },
      { autoCommit: false },
    );

    if (role === ROLE_KEYS.PHARMACIEN && functionName === "DEPOT") {
      await setAssignedDepot(conn, {
        userId,
        locationId: assignedLocationId,
        assignedByUserId: req.user?.sub,
      });
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  if (role === ROLE_KEYS.MEDECIN) {
    try {
      await ensureDoctorProfileForName({
        firstname: normalizedFirstname,
        lastname: normalizedLastname,
        specialty: doctorSpecialty,
      });
    } catch (error) {
      await dbQuery(`DELETE FROM ${USER_ROLES_TABLE} WHERE USER_ID = :userId`, {
        userId,
      });
      await dbQuery(`DELETE FROM ${USERS_TABLE} WHERE ID = :id`, {
        id: userId,
      });
      throw error;
    }
  }

  const assignedDepot = await getAssignedDepotMap([userId]);

  const createdUserRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );

  return res.status(201).json({
    user: shapeUser(
      createdUserRes.rows[0],
      [roleId],
      assignedDepot.get(userId) || null,
    ),
  });
}

export async function updateUserDepot(req, res) {
  const userId = Number(req.params.id);
  const locationId = Number(req.body.locationId);

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const locationRes = await dbQuery(
    `SELECT ID
     FROM ${LOCATION_TABLE}
     WHERE ID = :id`,
    { id: locationId },
  );

  if (locationRes.rows.length === 0) {
    return res.status(404).json({ message: "Location not found" });
  }

  const roleIds = await getRoleIdsByUserIds([userId]);
  const currentRoleIds = roleIds.get(userId) || [];

  if (!currentRoleIds.includes(2)) {
    return res.status(400).json({
      message: "Depot can only be assigned to pharmacists",
    });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    await setAssignedDepot(conn, {
      userId,
      locationId,
      assignedByUserId: req.user?.sub,
    });
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const assignedDepot = await getAssignedDepotMap([userId]);

  return res.json({
    user: shapeUser(
      userRes.rows[0],
      currentRoleIds,
      assignedDepot.get(userId) || null,
    ),
  });
}
