import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbQuery } from "../../config/db.js";

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

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function register(req, res) {
  const { email, username, password, firstname, lastname, functionName } = req.body;

  const DEFAULT_ROLE_ID = 2;

  const existing = await dbQuery(
    `SELECT ID FROM ${USERS_TABLE} WHERE EMAIL = :email`,
    { email }
  );

  if (existing.rows.length > 0) {
    return res.status(409).json({ message: "Email already used" });
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
      email,
      firstname,
      functionName,
      lastname,
      password: hashed,
      username,
    }
  );

  await dbQuery(
    `INSERT INTO ${USER_ROLES_TABLE} (USER_ID, ROLES_ID)
     VALUES (:userId, :roleId)`,
    { userId, roleId: DEFAULT_ROLE_ID }
  );

  const token = signToken({ sub: userId, email, username, roles: [DEFAULT_ROLE_ID] });

  return res.status(201).json({
    token,
    user: {
      id: userId,
      email,
      username,
      firstname,
      lastname,
      function: functionName,
      actived: 1,
      roles: [DEFAULT_ROLE_ID],
    },
  });
}

export async function login(req, res) {
  const { emailOrUsername, password } = req.body;

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, PASSWORD, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE EMAIL = :v OR USERNAME = :v`,
    { v: emailOrUsername }
  );

  if (userRes.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

  const user = userRes.rows[0];
  if (user.ACTIVED !== 1) return res.status(403).json({ message: "User disabled" });

  const ok = await bcrypt.compare(password, user.PASSWORD);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const rolesRes = await dbQuery(
    `SELECT ROLES_ID FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`,
    { id: user.ID }
  );
  const roles = rolesRes.rows.map((r) => r.ROLES_ID);

  const token = signToken({ sub: user.ID, email: user.EMAIL, username: user.USERNAME, roles });

  return res.json({
    token,
    user: {
      id: user.ID,
      email: user.EMAIL,
      username: user.USERNAME,
      firstname: user.FIRSTNAME,
      lastname: user.LASTNAME,
      function: user.FUNCTION,
      actived: user.ACTIVED,
      roles,
    },
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

  const rolesRes = await dbQuery(
    `SELECT ROLES_ID FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`,
    { id: userId }
  );
  const roles = rolesRes.rows.map((r) => r.ROLES_ID);

  return res.json({
    user: {
      id: user.ID,
      email: user.EMAIL,
      username: user.USERNAME,
      firstname: user.FIRSTNAME,
      lastname: user.LASTNAME,
      function: user.FUNCTION,
      actived: user.ACTIVED,
      roles,
    },
  });
}
