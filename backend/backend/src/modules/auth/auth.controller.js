import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbQuery } from "../../config/db.js";

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
}

async function getNextUserId() {
  try {
    const nextIdRes = await dbQuery(
      `SELECT PHARMACIE.UTILISATEUR_SEQ.NEXTVAL AS NEXT_ID FROM dual`
    );
    return nextIdRes.rows[0].NEXT_ID;
  } catch (error) {
    if (error?.errorNum !== 2289) throw error;

    const nextIdRes = await dbQuery(
      `SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM PHARMACIE.UTILISATEUR`
    );
    return nextIdRes.rows[0].NEXT_ID;
  }
}

export async function register(req, res) {
  const { email, username, password, firstname, lastname, functionName, roleId } = req.body;

  // Check unique email
  const existing = await dbQuery(
    `SELECT ID FROM PHARMACIE.UTILISATEUR WHERE EMAIL = :email`,
    { email }
  );
  if (existing.rows.length > 0) return res.status(409).json({ message: "Email already used" });

  const hashed = await bcrypt.hash(password, 10);

  const userId = await getNextUserId();

  await dbQuery(
    `INSERT INTO PHARMACIE.UTILISATEUR (ID, ACTIVED, EMAIL, FIRSTNAME, FUNCTION, LASTNAME, PASSWORD, USERNAME)
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
    `INSERT INTO PHARMACIE.UTILISATEUR_ROLE (USER_ID, ROLES_ID)
     VALUES (:userId, :roleId)`,
    { userId, roleId }
  );

  const token = signToken({ sub: userId, email, username });

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
      roles: [roleId],
    },
  });
}

export async function login(req, res) {
  const { emailOrUsername, password } = req.body;

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, PASSWORD, FIRSTNAME, LASTNAME, FUNCTION
     FROM PHARMACIE.UTILISATEUR
     WHERE EMAIL = :v OR USERNAME = :v`,
    { v: emailOrUsername }
  );

  if (userRes.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

  const user = userRes.rows[0];
  if (user.ACTIVED !== 1) return res.status(403).json({ message: "User disabled" });

  const ok = await bcrypt.compare(password, user.PASSWORD);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const rolesRes = await dbQuery(
    `SELECT ROLES_ID FROM PHARMACIE.UTILISATEUR_ROLE WHERE USER_ID = :id`,
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

// ✅ NEW: GET /api/auth/me (requires JWT middleware)
export async function me(req, res) {
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM PHARMACIE.UTILISATEUR
     WHERE ID = :id`,
    { id: userId }
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = userRes.rows[0];

  const rolesRes = await dbQuery(
    `SELECT ROLES_ID FROM PHARMACIE.UTILISATEUR_ROLE WHERE USER_ID = :id`,
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