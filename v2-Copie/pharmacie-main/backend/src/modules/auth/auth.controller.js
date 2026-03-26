import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbQuery } from "../../config/db.js";
import { buildAccessFromRoleIds, DEFAULT_ROLE_ID, ROLE_KEYS } from "../../utils/rbac.js";

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
const DOCTOR_TABLE = withSchema("DOCTOR");

let doctorActivedColumnChecked = false;

async function ensureDoctorActivedColumn() {
  if (doctorActivedColumnChecked) return;

  const owner = getSchemaName();
  const result = await dbQuery(
    `SELECT 1
     FROM ALL_TAB_COLUMNS
     WHERE OWNER = :owner
       AND TABLE_NAME = 'DOCTOR'
       AND COLUMN_NAME = 'ACTIVED'`,
    { owner }
  );

  if (result.rows.length === 0) {
    await dbQuery(`ALTER TABLE ${DOCTOR_TABLE} ADD (ACTIVED NUMBER(1) DEFAULT 1 NOT NULL)`);
  }

  doctorActivedColumnChecked = true;
}

async function getNextDoctorId() {
  const result = await dbQuery(`SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${DOCTOR_TABLE}`);
  return result.rows[0].NEXT_ID;
}

async function createDoctorFromUser({ firstname, lastname }) {
  await ensureDoctorActivedColumn();

  const doctorId = await getNextDoctorId();
  const fullName = `${firstname} ${lastname}`.trim();

  await dbQuery(
    `INSERT INTO ${DOCTOR_TABLE} (ID, NAME, SPECIALTY, ADDRESS, TEL, ACTIVED)
     VALUES (:id, :name, NULL, NULL, NULL, 1)`,
    {
      id: doctorId,
      name: fullName,
    }
  );
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function shouldSyncDoctorProfile(user, roleIds) {
  const functionName = String(user?.FUNCTION || "").trim().toUpperCase();
  if (functionName === "DOCTOR") return true;

  const access = buildAccessFromRoleIds(roleIds);
  return access.roles.includes(ROLE_KEYS.MEDECIN);
}

async function ensureDoctorProfileForUser(user, roleIds) {
  if (!shouldSyncDoctorProfile(user, roleIds)) return;

  const firstname = normalizeName(user?.FIRSTNAME);
  const lastname = normalizeName(user?.LASTNAME);
  const fullName = normalizeName(`${firstname} ${lastname}`);

  if (!fullName) return;

  await ensureDoctorActivedColumn();

  const existing = await dbQuery(
    `SELECT ID, NVL(ACTIVED, 1) AS ACTIVED
     FROM ${DOCTOR_TABLE}
     WHERE UPPER(TRIM(NAME)) = UPPER(:name)
     ORDER BY ID
     FETCH FIRST 1 ROWS ONLY`,
    { name: fullName }
  );

  if (existing.rows.length === 0) {
    await createDoctorFromUser({ firstname, lastname });
    return;
  }

  const doctor = existing.rows[0];
  if (Number(doctor.ACTIVED ?? 1) !== 1) {
    await dbQuery(`UPDATE ${DOCTOR_TABLE} SET ACTIVED = 1 WHERE ID = :id`, {
      id: doctor.ID,
    });
  }
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function getUserRoleIds(userId) {
  const rolesRes = await dbQuery(
    `SELECT ROLES_ID FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`,
    { id: userId }
  );

  return rolesRes.rows.map((row) => row.ROLES_ID);
}

function shapeAuthUser(user, roleIds) {
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

function signUserToken(user, roleIds) {
  const access = buildAccessFromRoleIds(roleIds);

  return signToken({
    sub: user.ID,
    email: user.EMAIL,
    username: user.USERNAME,
    roleIds: access.roleIds,
    roles: access.roles,
    permissions: access.permissions,
  });
}

export async function register(req, res) {
  const { email, username, password, firstname, lastname, functionName } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();
  const normalizedFirstname = String(firstname).trim();
  const normalizedLastname = String(lastname).trim();

  const existing = await dbQuery(
    `SELECT ID, EMAIL, USERNAME FROM ${USERS_TABLE} WHERE LOWER(EMAIL) = LOWER(:email) OR LOWER(USERNAME) = LOWER(:username)`,
    { email: normalizedEmail, username: normalizedUsername }
  );

  if (existing.rows.length > 0) {
    const duplicated = existing.rows[0];
    if (duplicated?.EMAIL?.toLowerCase() === normalizedEmail) {
      return res.status(409).json({ message: "Email already used" });
    }
    return res.status(409).json({ message: "Username already used" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const nextIdRes = await dbQuery(
    `SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${USERS_TABLE}`
  );
  const userId = nextIdRes.rows[0].NEXT_ID;

  await dbQuery(
    `INSERT INTO ${USERS_TABLE} (ID, ACTIVED, EMAIL, FIRSTNAME, FUNCTION, LASTNAME, PASSWORD, USERNAME)
     VALUES (:id, :actived, :email, :firstname, :functionName, :lastname, :password, :username)`,
    {
      id: userId,
      actived: 1,
      email: normalizedEmail,
      firstname: normalizedFirstname,
      functionName,
      lastname: normalizedLastname,
      password: hashed,
      username: normalizedUsername,
    }
  );

  await dbQuery(
    `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID)
     VALUES (:userId, :roleId)`,
    { userId, roleId: DEFAULT_ROLE_ID }
  );

  if (functionName === "DOCTOR") {
    try {
      await createDoctorFromUser({
        firstname: normalizedFirstname,
        lastname: normalizedLastname,
      });
    } catch (error) {
      await dbQuery(`DELETE FROM ${USER_ROLES_TABLE} WHERE USER_ID = :userId`, { userId });
      await dbQuery(`DELETE FROM ${USERS_TABLE} WHERE ID = :id`, { id: userId });
      throw error;
    }
  }

  const createdUser = {
    ID: userId,
    EMAIL: normalizedEmail,
    USERNAME: normalizedUsername,
    FIRSTNAME: normalizedFirstname,
    LASTNAME: normalizedLastname,
    FUNCTION: functionName,
    ACTIVED: 1,
  };

  const token = signUserToken(createdUser, [DEFAULT_ROLE_ID]);

  return res.status(201).json({
    token,
    user: shapeAuthUser(createdUser, [DEFAULT_ROLE_ID]),
  });
}

export async function login(req, res) {
  const { emailOrUsername, password } = req.body;
  const normalizedLogin = String(emailOrUsername).trim();

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, PASSWORD, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE LOWER(EMAIL) = LOWER(:v) OR LOWER(USERNAME) = LOWER(:v)`,
    { v: normalizedLogin }
  );

  if (userRes.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

  const user = userRes.rows[0];
  if (user.ACTIVED !== 1) return res.status(403).json({ message: "User disabled" });

  const ok = await bcrypt.compare(password, user.PASSWORD);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const roleIds = await getUserRoleIds(user.ID);
  await ensureDoctorProfileForUser(user, roleIds);
  const token = signUserToken(user, roleIds);

  return res.json({
    token,
    user: shapeAuthUser(user, roleIds),
  });
}

export async function me(req, res) {
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId }
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = userRes.rows[0];

  const roleIds = await getUserRoleIds(userId);
  await ensureDoctorProfileForUser(user, roleIds);

  return res.json({
    user: shapeAuthUser(user, roleIds),
  });
}
