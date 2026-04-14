import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbQuery } from "../../config/db.js";
import { buildAccessFromRoleIds } from "../../utils/rbac.js";

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

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function getUserRoleIds(userId) {
  const rolesRes = await dbQuery(
    `SELECT ROLES_ID FROM ${USER_ROLES_TABLE} WHERE USER_ID = :id`,
    { id: userId },
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

export async function login(req, res) {
  const { emailOrUsername, password } = req.body;
  const normalizedLogin = String(emailOrUsername).trim();

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, PASSWORD, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE LOWER(EMAIL) = LOWER(:v) OR LOWER(USERNAME) = LOWER(:v)`,
    { v: normalizedLogin },
  );

  if (userRes.rows.length === 0)
    return res.status(401).json({ message: "Invalid credentials" });

  const user = userRes.rows[0];
  if (user.ACTIVED !== 1)
    return res.status(403).json({ message: "User disabled" });

  const ok = await bcrypt.compare(password, user.PASSWORD);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const roleIds = await getUserRoleIds(user.ID);
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
    { id: userId },
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = userRes.rows[0];

  const roleIds = await getUserRoleIds(userId);

  return res.json({
    user: shapeAuthUser(user, roleIds),
  });
}

export async function updateMe(req, res) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const updates = req.body;
  const normalizedEmail = updates.email
    ? String(updates.email).trim().toLowerCase()
    : undefined;
  const normalizedUsername = updates.username
    ? String(updates.username).trim()
    : undefined;
  const normalizedFirstname = updates.firstname
    ? String(updates.firstname).trim()
    : undefined;
  const normalizedLastname = updates.lastname
    ? String(updates.lastname).trim()
    : undefined;
  const normalizedFunctionName =
    typeof updates.functionName === "string"
      ? updates.functionName.trim() || null
      : undefined;

  if (normalizedEmail || normalizedUsername) {
    const duplicateRes = await dbQuery(
      `SELECT ID
       FROM ${USERS_TABLE}
       WHERE ID <> :id
         AND (
           (${normalizedEmail ? "LOWER(EMAIL) = LOWER(:email)" : "1 = 0"})
           OR
           (${normalizedUsername ? "LOWER(USERNAME) = LOWER(:username)" : "1 = 0"})
         )`,
      {
        id: userId,
        email: normalizedEmail,
        username: normalizedUsername,
      },
    );

    if (duplicateRes.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Email or username already used" });
    }
  }

  const fields = [];
  const binds = { id: userId };

  if (normalizedEmail !== undefined) {
    fields.push("EMAIL = :email");
    binds.email = normalizedEmail;
  }
  if (normalizedUsername !== undefined) {
    fields.push("USERNAME = :username");
    binds.username = normalizedUsername;
  }
  if (normalizedFirstname !== undefined) {
    fields.push("FIRSTNAME = :firstname");
    binds.firstname = normalizedFirstname;
  }
  if (normalizedLastname !== undefined) {
    fields.push("LASTNAME = :lastname");
    binds.lastname = normalizedLastname;
  }
  if (normalizedFunctionName !== undefined) {
    fields.push("FUNCTION = :functionName");
    binds.functionName = normalizedFunctionName;
  }

  if (fields.length > 0) {
    await dbQuery(
      `UPDATE ${USERS_TABLE}
       SET ${fields.join(", ")}
       WHERE ID = :id`,
      binds,
    );
  }

  const userRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, USERNAME, FIRSTNAME, LASTNAME, FUNCTION
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const roleIds = await getUserRoleIds(userId);
  return res.json({
    user: shapeAuthUser(userRes.rows[0], roleIds),
  });
}

export async function updateMyPassword(req, res) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { currentPassword, newPassword } = req.body;

  const userRes = await dbQuery(
    `SELECT ID, PASSWORD
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId },
  );

  if (userRes.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = userRes.rows[0];
  const isValid = await bcrypt.compare(currentPassword, user.PASSWORD);

  if (!isValid) {
    return res.status(400).json({ message: "Current password is invalid" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await dbQuery(
    `UPDATE ${USERS_TABLE}
     SET PASSWORD = :password
     WHERE ID = :id`,
    { id: userId, password: hashedPassword },
  );

  return res.json({ message: "Password updated successfully" });
}
