import { dbQuery, initDb } from "../config/db.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

export const PHARMACIST_DEPOT_TABLE = withSchema("PHARMACIST_DEPOT");
const LOCATION_TABLE = withSchema("LOCATION");

let tableReady = false;

export async function ensurePharmacistDepotTable() {
  if (tableReady) return;

  try {
    await dbQuery(`SELECT 1 FROM ${PHARMACIST_DEPOT_TABLE} WHERE 1 = 0`);
    tableReady = true;
    return;
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }
  }

  await dbQuery(`
    CREATE TABLE ${PHARMACIST_DEPOT_TABLE} (
      USER_ID NUMBER PRIMARY KEY,
      LOCATION_ID NUMBER NOT NULL,
      ASSIGNED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      ASSIGNED_BY_USER_ID NUMBER
    )
  `);

  try {
    await dbQuery(
      `CREATE INDEX IDX_PHARM_DEPOT_LOCATION ON ${PHARMACIST_DEPOT_TABLE} (LOCATION_ID)`
    );
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  tableReady = true;
}

export async function getAssignedDepotByUserId(userId) {
  await ensurePharmacistDepotTable();

  const result = await dbQuery(
    `SELECT
       pd.USER_ID AS user_id,
       pd.LOCATION_ID AS location_id,
       pd.ASSIGNED_AT AS assigned_at,
       pd.ASSIGNED_BY_USER_ID AS assigned_by_user_id,
       loc.LIB AS location_label
     FROM ${PHARMACIST_DEPOT_TABLE} pd
     LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = pd.LOCATION_ID
     WHERE pd.USER_ID = :user_id`,
    { user_id: userId },
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    userId: row.USER_ID,
    locationId: row.LOCATION_ID,
    locationLabel: row.LOCATION_LABEL || null,
    assignedAt: row.ASSIGNED_AT || null,
    assignedByUserId: row.ASSIGNED_BY_USER_ID || null,
  };
}

export async function getAssignedDepotMap(userIds) {
  await ensurePharmacistDepotTable();

  if (userIds.length === 0) {
    return new Map();
  }

  const bindNames = userIds.map((_, index) => `id${index}`);
  const binds = Object.fromEntries(
    bindNames.map((bindName, index) => [bindName, userIds[index]]),
  );

  const result = await dbQuery(
    `SELECT
       pd.USER_ID AS user_id,
       pd.LOCATION_ID AS location_id,
       pd.ASSIGNED_AT AS assigned_at,
       pd.ASSIGNED_BY_USER_ID AS assigned_by_user_id,
       loc.LIB AS location_label
     FROM ${PHARMACIST_DEPOT_TABLE} pd
     LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = pd.LOCATION_ID
     WHERE pd.USER_ID IN (${bindNames.map((name) => `:${name}`).join(", ")})`,
    binds,
  );

  const assignments = new Map();
  for (const row of result.rows) {
    assignments.set(row.USER_ID, {
      userId: row.USER_ID,
      locationId: row.LOCATION_ID,
      locationLabel: row.LOCATION_LABEL || null,
      assignedAt: row.ASSIGNED_AT || null,
      assignedByUserId: row.ASSIGNED_BY_USER_ID || null,
    });
  }

  return assignments;
}

export async function setAssignedDepot(conn, { userId, locationId, assignedByUserId }) {
  await ensurePharmacistDepotTable();

  await conn.execute(
    `MERGE INTO ${PHARMACIST_DEPOT_TABLE} target
     USING (
       SELECT
         :user_id AS user_id,
         :location_id AS location_id,
         :assigned_by_user_id AS assigned_by_user_id
       FROM dual
     ) source
     ON (target.USER_ID = source.user_id)
     WHEN MATCHED THEN
       UPDATE SET
         target.LOCATION_ID = source.location_id,
         target.ASSIGNED_AT = SYSTIMESTAMP,
         target.ASSIGNED_BY_USER_ID = source.assigned_by_user_id
     WHEN NOT MATCHED THEN
       INSERT (USER_ID, LOCATION_ID, ASSIGNED_AT, ASSIGNED_BY_USER_ID)
       VALUES (source.user_id, source.location_id, SYSTIMESTAMP, source.assigned_by_user_id)`
    ,
    {
      user_id: userId,
      location_id: locationId,
      assigned_by_user_id: assignedByUserId || null,
    },
    { autoCommit: false },
  );
}

export async function clearAssignedDepot(conn, userId) {
  await ensurePharmacistDepotTable();

  await conn.execute(
    `DELETE FROM ${PHARMACIST_DEPOT_TABLE} WHERE USER_ID = :user_id`,
    { user_id: userId },
    { autoCommit: false },
  );
}

export async function ensureUserHasDepotOrThrow(user) {
  const assignedDepot = await getAssignedDepotByUserId(Number(user?.sub));
  if (!assignedDepot) {
    const error = new Error("Pharmacien depot assignment is missing.");
    error.status = 403;
    throw error;
  }
  return assignedDepot;
}
