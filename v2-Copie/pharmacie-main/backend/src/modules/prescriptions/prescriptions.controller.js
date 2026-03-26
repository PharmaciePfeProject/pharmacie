import { dbQuery, initDb } from "../../config/db.js";
import { chunkValues } from "../../utils/oracle.js";
import { runPaginatedQuery } from "../../utils/pagination.js";
import { ROLE_KEYS } from "../../utils/rbac.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const PRESCRIPTION_TABLE = withSchema("PRESCRIPTION");
const PRESCRIPTION_LINE_TABLE = withSchema("PRESCRIPTION_LINE");
const PRODUCT_TABLE = withSchema("PRODUCT");
const DOCTOR_TABLE = withSchema("DOCTOR");
const USERS_TABLE = withSchema("UTILISATEUR");
let doctorActivedChecked = false;

async function ensureDoctorActivedColumn() {
  if (doctorActivedChecked) return;

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

  doctorActivedChecked = true;
}

const prescriptionHeaderSelect = `
  SELECT
    p.ID AS prescription_id,
    p.AGENT_ID AS agent_id,
    p.AGENT_SITUATION AS agent_situation,
    p.DISTRIBUTED AS distributed,
    p.PRESCRIPTION_DATE AS prescription_date,
    p.PRESCRIPTION_NUMBER AS prescription_number,
    p.TYPE AS type,
    p.DOCTOR_ID AS doctor_id,
    d.NAME AS doctor_name
  FROM ${PRESCRIPTION_TABLE} p
  LEFT JOIN ${DOCTOR_TABLE} d ON d.ID = p.DOCTOR_ID
`;

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

async function getConnectedDoctorId(user) {
  const userId = Number(user?.sub);
  if (!Number.isFinite(userId)) return null;

  const userResult = await dbQuery(
    `SELECT FIRSTNAME, LASTNAME
     FROM ${USERS_TABLE}
     WHERE ID = :id`,
    { id: userId }
  );

  if (userResult.rows.length === 0) return null;

  const userRow = userResult.rows[0];
  const fullName = normalizeName(`${userRow.FIRSTNAME} ${userRow.LASTNAME}`);
  if (!fullName) return null;

  const doctorResult = await dbQuery(
    `SELECT ID
     FROM ${DOCTOR_TABLE}
     WHERE UPPER(TRIM(NAME)) = UPPER(:name)
     ORDER BY ID
     FETCH FIRST 1 ROWS ONLY`,
    { name: fullName }
  );

  if (doctorResult.rows.length === 0) return null;
  return Number(doctorResult.rows[0].ID);
}

async function buildPrescriptionFilters(query, user) {
  const clauses = [];
  const binds = {};

  const isDoctorUser = Array.isArray(user?.roles) && user.roles.includes(ROLE_KEYS.MEDECIN);
  if (isDoctorUser) {
    const connectedDoctorId = await getConnectedDoctorId(user);
    clauses.push("p.DOCTOR_ID = :connected_doctor_id");
    binds.connected_doctor_id = Number.isFinite(connectedDoctorId) ? connectedDoctorId : -1;
  }

  if (query.doctor_id !== undefined) {
    clauses.push("p.DOCTOR_ID = :doctor_id");
    binds.doctor_id = query.doctor_id;
  }

  if (query.product_id !== undefined) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM ${PRESCRIPTION_LINE_TABLE} pl
        WHERE pl.PRESCRIPTION_ID = p.ID
          AND pl.PRODUCT_ID = :product_id
      )`
    );
    binds.product_id = query.product_id;
  }

  if (query.prescription_number) {
    clauses.push("UPPER(p.PRESCRIPTION_NUMBER) LIKE UPPER(:prescription_number)");
    binds.prescription_number = `%${query.prescription_number}%`;
  }

  if (query.date_from !== undefined) {
    clauses.push("p.PRESCRIPTION_DATE >= TO_DATE(:date_from, 'YYYY-MM-DD')");
    binds.date_from = query.date_from;
  }

  if (query.date_to !== undefined) {
    clauses.push("p.PRESCRIPTION_DATE < TO_DATE(:date_to, 'YYYY-MM-DD') + 1");
    binds.date_to = query.date_to;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getPrescriptionLines(prescriptionIds) {
  if (prescriptionIds.length === 0) return [];

  const rows = [];

  for (const idsChunk of chunkValues(prescriptionIds)) {
    const bindNames = idsChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(idsChunk.map((id, index) => [`id${index}`, id]));

    const result = await dbQuery(
      `
      SELECT
        pl.ID AS line_id,
        pl.PRESCRIPTION_ID AS prescription_id,
        pl.PRODUCT_ID AS product_id,
        prod.LIB AS product_lib,
        pl.TOTAL_QT AS total_qt,
        pl.DAYS AS days,
        pl.DIST_NUMBER AS dist_number,
        pl.IS_PERIODIC AS is_periodic,
        pl.PERIODICITY AS periodicity,
        pl.POSOLOGIE AS posologie,
        pl.DISTRIBUTED AS distributed
      FROM ${PRESCRIPTION_LINE_TABLE} pl
      LEFT JOIN ${PRODUCT_TABLE} prod ON prod.ID = pl.PRODUCT_ID
      WHERE pl.PRESCRIPTION_ID IN (${bindNames.map((name) => `:${name}`).join(", ")})
      ORDER BY pl.PRESCRIPTION_ID DESC, pl.ID ASC
      `,
      binds
    );

    rows.push(...result.rows);
  }

  return rows;
}

function mapPrescriptionHeader(header) {
  return {
    prescription_id: header.PRESCRIPTION_ID,
    agent_id: header.AGENT_ID,
    agent_situation: header.AGENT_SITUATION,
    distributed: header.DISTRIBUTED,
    prescription_date: header.PRESCRIPTION_DATE,
    prescription_number: header.PRESCRIPTION_NUMBER,
    type: header.TYPE,
    doctor_id: header.DOCTOR_ID,
    doctor_name: header.DOCTOR_NAME,
  };
}

function attachLines(headers, lines) {
  const linesByPrescriptionId = new Map();

  for (const line of lines) {
    const key = line.PRESCRIPTION_ID;
    if (!linesByPrescriptionId.has(key)) linesByPrescriptionId.set(key, []);

    linesByPrescriptionId.get(key).push({
      line_id: line.LINE_ID,
      product_id: line.PRODUCT_ID,
      product_lib: line.PRODUCT_LIB,
      total_qt: line.TOTAL_QT,
      days: line.DAYS,
      dist_number: line.DIST_NUMBER,
      is_periodic: line.IS_PERIODIC,
      periodicity: line.PERIODICITY,
      posologie: line.POSOLOGIE,
      distributed: line.DISTRIBUTED,
    });
  }

  return headers.map((header) => {
    const item = mapPrescriptionHeader(header);
    return {
      ...item,
      lines: linesByPrescriptionId.get(header.PRESCRIPTION_ID) || [],
    };
  });
}

async function assertDoctorExists(doctorId) {
  const result = await dbQuery(`SELECT ID FROM ${DOCTOR_TABLE} WHERE ID = :id`, { id: doctorId });
  if (result.rows.length === 0) {
    const error = new Error("Invalid doctor_id");
    error.status = 400;
    error.details = { doctor_id: "Unknown doctor" };
    throw error;
  }
}

async function assertProductsExist(productIds) {
  if (productIds.length === 0) return;

  const uniqueIds = [...new Set(productIds)];
  const bindNames = uniqueIds.map((_, index) => `id${index}`);
  const binds = Object.fromEntries(uniqueIds.map((id, index) => [`id${index}`, id]));

  const result = await dbQuery(
    `SELECT ID FROM ${PRODUCT_TABLE} WHERE ID IN (${bindNames.map((name) => `:${name}`).join(", ")})`,
    binds
  );

  const existing = new Set(result.rows.map((row) => row.ID));
  const missing = uniqueIds.filter((id) => !existing.has(id));

  if (missing.length > 0) {
    const error = new Error("Invalid products in lines");
    error.status = 400;
    error.details = { product_id: `Unknown product ids: ${missing.join(", ")}` };
    throw error;
  }
}

async function getNextId(conn, tableName) {
  const result = await conn.execute(`SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${tableName}`);
  return result.rows[0].NEXT_ID;
}

export async function listPrescriptions(req, res) {
  const { where, binds } = await buildPrescriptionFilters(req.query, req.user);
  const result = await runPaginatedQuery({
    baseSql: `${prescriptionHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY p.PRESCRIPTION_DATE DESC, p.ID DESC",
    query: req.query,
  });

  const lines = await getPrescriptionLines(result.items.map((header) => header.PRESCRIPTION_ID));

  return res.json({
    items: attachLines(result.items, lines),
    pagination: result.pagination,
  });
}

export async function getPrescriptionById(req, res) {
  const headerResult = await dbQuery(`${prescriptionHeaderSelect} WHERE p.ID = :id`, { id: req.params.id });

  if (headerResult.rows.length === 0) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  const lines = await getPrescriptionLines([req.params.id]);
  const [item] = attachLines(headerResult.rows, lines);
  return res.json({ item });
}

export async function createPrescription(req, res) {
  const doctorId = req.body.doctor_id;
  await assertDoctorExists(doctorId);
  await assertProductsExist(req.body.lines.map((line) => line.product_id));

  const pool = await initDb();
  const conn = await pool.getConnection();

  let prescriptionId;

  try {
    prescriptionId = await getNextId(conn, PRESCRIPTION_TABLE);

    await conn.execute(
      `INSERT INTO ${PRESCRIPTION_TABLE} (
        ID,
        AGENT_ID,
        AGENT_SITUATION,
        DISTRIBUTED,
        PRESCRIPTION_DATE,
        PRESCRIPTION_NUMBER,
        TYPE,
        DOCTOR_ID
      ) VALUES (
        :id,
        :agent_id,
        :agent_situation,
        :distributed,
        SYSTIMESTAMP,
        :prescription_number,
        :type,
        :doctor_id
      )`,
      {
        id: prescriptionId,
        agent_id: req.body.agent_id || null,
        agent_situation: req.body.agent_situation || null,
        distributed: req.body.distributed ?? 0,
        prescription_number: req.body.prescription_number || null,
        type: req.body.type || null,
        doctor_id: doctorId,
      },
      { autoCommit: false }
    );

    let nextLineId = await getNextId(conn, PRESCRIPTION_LINE_TABLE);

    for (const line of req.body.lines) {
      await conn.execute(
        `INSERT INTO ${PRESCRIPTION_LINE_TABLE} (
          ID,
          DAYS,
          DIST_NUMBER,
          DISTRIBUTED,
          IS_PERIODIC,
          PERIODICITY,
          POSOLOGIE,
          TOTAL_QT,
          PRESCRIPTION_ID,
          PRODUCT_ID
        ) VALUES (
          :id,
          :days,
          :dist_number,
          :distributed,
          :is_periodic,
          :periodicity,
          :posologie,
          :total_qt,
          :prescription_id,
          :product_id
        )`,
        {
          id: nextLineId,
          days: line.days ?? null,
          dist_number: line.dist_number ?? null,
          distributed: line.distributed ?? 0,
          is_periodic: line.is_periodic ?? 0,
          periodicity: line.periodicity || null,
          posologie: line.posologie || null,
          total_qt: line.total_qt,
          prescription_id: prescriptionId,
          product_id: line.product_id,
        },
        { autoCommit: false }
      );

      nextLineId += 1;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const headerResult = await dbQuery(`${prescriptionHeaderSelect} WHERE p.ID = :id`, { id: prescriptionId });
  const lines = await getPrescriptionLines([prescriptionId]);
  const [item] = attachLines(headerResult.rows, lines);

  return res.status(201).json({ item });
}

export async function listPrescriptionDoctors(req, res) {
  await ensureDoctorActivedColumn();

  const result = await dbQuery(
    `SELECT
      d.ID AS doctor_id,
      d.NAME AS name,
      d.SPECIALTY AS specialty,
      d.ADDRESS AS address,
      d.TEL AS tel,
      NVL(d.ACTIVED, 1) AS actived
    FROM ${DOCTOR_TABLE} d
    WHERE NVL(d.ACTIVED, 1) = 1
    ORDER BY d.NAME, d.ID`
  );

  return res.json({
    items: result.rows.map((row) => ({
      doctor_id: row.DOCTOR_ID,
      name: row.NAME,
      specialty: row.SPECIALTY,
      address: row.ADDRESS,
      tel: row.TEL,
      actived: row.ACTIVED,
    })),
  });
}

export async function listPrescriptionAgents(req, res) {
  const result = await dbQuery(
    `SELECT agent_id, agent_situation
     FROM (
       SELECT
         p.AGENT_ID AS agent_id,
         p.AGENT_SITUATION AS agent_situation,
         ROW_NUMBER() OVER (
           PARTITION BY p.AGENT_ID
           ORDER BY p.PRESCRIPTION_DATE DESC NULLS LAST, p.ID DESC
         ) AS rn
       FROM ${PRESCRIPTION_TABLE} p
       WHERE p.AGENT_ID IS NOT NULL
     ) ranked
     WHERE rn = 1
     ORDER BY agent_id`
  );

  return res.json({
    items: result.rows.map((row) => ({
      agent_id: row.AGENT_ID,
      agent_situation: row.AGENT_SITUATION,
    })),
  });
}

export async function listPrescriptionTypes(req, res) {
  const result = await dbQuery(
    `SELECT DISTINCT p.TYPE AS type
     FROM ${PRESCRIPTION_TABLE} p
     WHERE p.TYPE IS NOT NULL
     ORDER BY p.TYPE`
  );

  return res.json({
    items: result.rows.map((row) => ({
      type: row.TYPE,
    })),
  });
}
