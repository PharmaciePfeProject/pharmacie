import { dbQuery, initDb } from "../config/db.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

export const DOCTOR_TABLE = withSchema("DOCTOR");
const USERS_TABLE = withSchema("UTILISATEUR");

let doctorActivedColumnPromise = null;

export function normalizeHumanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export async function hasDoctorActivedColumn() {
  if (!doctorActivedColumnPromise) {
    const owner = getSchemaName();
    doctorActivedColumnPromise = dbQuery(
      `SELECT 1
       FROM ALL_TAB_COLUMNS
       WHERE OWNER = :owner
         AND TABLE_NAME = 'DOCTOR'
         AND COLUMN_NAME = 'ACTIVED'`,
      { owner }
    )
      .then((result) => result.rows.length > 0)
      .catch((error) => {
        doctorActivedColumnPromise = null;
        throw error;
      });
  }

  return doctorActivedColumnPromise;
}

export async function getDoctorActivedExpression(alias = "d") {
  return (await hasDoctorActivedColumn()) ? `NVL(${alias}.ACTIVED, 1)` : "1";
}

export async function findDoctorByExactName(name, { activeOnly = false } = {}) {
  const normalizedName = normalizeHumanName(name);
  if (!normalizedName) return null;

  const hasActived = await hasDoctorActivedColumn();
  const activeSelect = hasActived ? "NVL(ACTIVED, 1) AS ACTIVED" : "1 AS ACTIVED";
  const activeWhere = activeOnly && hasActived ? " AND NVL(ACTIVED, 1) = 1" : "";

  const result = await dbQuery(
    `SELECT ID, NAME, ${activeSelect}
     FROM ${DOCTOR_TABLE}
     WHERE UPPER(TRIM(NAME)) = UPPER(:name)${activeWhere}
     ORDER BY ID`,
    { name: normalizedName }
  );

  if (result.rows.length === 0) return null;

  if (result.rows.length > 1) {
    const error = new Error("Multiple doctor profiles match this user.");
    error.status = 409;
    error.details = {
      doctor: "Doctor identity is ambiguous. Ask an administrator to keep only one matching doctor profile.",
    };
    throw error;
  }

  const doctor = result.rows[0];
  return {
    doctor_id: Number(doctor.ID),
    name: doctor.NAME,
    actived: Number(doctor.ACTIVED ?? 1),
  };
}

export async function resolveDoctorForUser(user) {
  const userId = Number(user?.sub ?? user?.id ?? user?.ID);
  if (!Number.isFinite(userId)) return null;

  const userResult = await dbQuery(
    `SELECT FIRSTNAME, LASTNAME
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId }
  );

  if (userResult.rows.length === 0) return null;

  const row = userResult.rows[0];
  const fullName = normalizeHumanName(`${row.FIRSTNAME} ${row.LASTNAME}`);
  if (!fullName) return null;

  return findDoctorByExactName(fullName, { activeOnly: true });
}

export async function ensureDoctorProfileForName({ firstname, lastname, specialty }, conn = null) {
  const fullName = normalizeHumanName(`${firstname} ${lastname}`);
  const normalizedSpecialty = String(specialty || "").trim() || null;
  if (!fullName) return null;

  const existing = await findDoctorByExactName(fullName);
  const hasActived = await hasDoctorActivedColumn();

  if (existing) {
    if (hasActived && existing.actived !== 1) {
      await dbQuery(`UPDATE ${DOCTOR_TABLE} SET ACTIVED = 1 WHERE ID = :id`, {
        id: existing.doctor_id,
      });
    }

    if (normalizedSpecialty) {
      await dbQuery(
        `UPDATE ${DOCTOR_TABLE}
         SET SPECIALTY = :specialty
         WHERE ID = :id`,
        {
          id: existing.doctor_id,
          specialty: normalizedSpecialty,
        }
      );
    }

    return existing.doctor_id;
  }

  const runInsert = async (activeConn) => {
    await activeConn.execute(`LOCK TABLE ${DOCTOR_TABLE} IN EXCLUSIVE MODE`);

    const duplicateCheck = await activeConn.execute(
      `SELECT ID
       FROM ${DOCTOR_TABLE}
       WHERE UPPER(TRIM(NAME)) = UPPER(:name)
       ORDER BY ID`,
      { name: fullName }
    );

    if (duplicateCheck.rows.length > 0) {
      return Number(duplicateCheck.rows[0].ID);
    }

    const nextIdResult = await activeConn.execute(
      `SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${DOCTOR_TABLE}`
    );
    const doctorId = Number(nextIdResult.rows[0].NEXT_ID);

    if (hasActived) {
      await activeConn.execute(
        `INSERT INTO ${DOCTOR_TABLE} (ID, NAME, SPECIALTY, ADDRESS, TEL, ACTIVED)
         VALUES (:id, :name, :specialty, NULL, NULL, 1)`,
        { id: doctorId, name: fullName, specialty: normalizedSpecialty },
        { autoCommit: false }
      );
    } else {
      await activeConn.execute(
        `INSERT INTO ${DOCTOR_TABLE} (ID, NAME, SPECIALTY, ADDRESS, TEL)
         VALUES (:id, :name, :specialty, NULL, NULL)`,
        { id: doctorId, name: fullName, specialty: normalizedSpecialty },
        { autoCommit: false }
      );
    }

    return doctorId;
  };

  if (conn) {
    return runInsert(conn);
  }

  const pool = await initDb();
  const ownedConn = await pool.getConnection();

  try {
    const doctorId = await runInsert(ownedConn);
    await ownedConn.commit();
    return doctorId;
  } catch (error) {
    await ownedConn.rollback();
    throw error;
  } finally {
    await ownedConn.close();
  }
}
