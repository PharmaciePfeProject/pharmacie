import { dbQuery, initDb } from "../../config/db.js";
import { chunkValues } from "../../utils/oracle.js";
import { runPaginatedQuery } from "../../utils/pagination.js";
import { ROLE_KEYS } from "../../utils/rbac.js";
import { getNextIdWithTableLock } from "../../utils/oracleIds.js";
import {
  DOCTOR_TABLE,
  getDoctorActivedExpression,
  hasDoctorActivedColumn,
  resolveDoctorForUser,
} from "../../utils/doctorProfiles.js";

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
const PRESCRIPTION_APPROVAL_TABLE = withSchema("PRESCRIPTION_APPROVAL");
const PRESCRIPTION_REQUEST_TABLE = withSchema("PRESCRIPTION_MEDICAL_REQUEST");
const PRODUCT_TABLE = withSchema("PRODUCT");
const USERS_TABLE = withSchema("UTILISATEUR");
const USER_ROLES_TABLE = withSchema("UTILISATEUR_ROLE");
const PHARMACIEN_ROLE_ID = 2;

let approvalTableReady = false;
let medicalRequestTableReady = false;

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LOCATION_STOP_WORDS = new Set([
  "AGENT",
  "SERVICE",
  "BLOC",
  "ETAGE",
  "ZONE",
  "SITE",
  "HOPITAL",
  "CENTRE",
]);

function extractLocationTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !LOCATION_STOP_WORDS.has(token));
}

function scoreLocationMatch(agentTokens, pharmacistFunctionName) {
  if (agentTokens.length === 0) return 0;

  const normalizedFunction = normalizeText(pharmacistFunctionName);
  if (!normalizedFunction) return 0;

  return agentTokens.reduce(
    (score, token) => score + (normalizedFunction.includes(token) ? 1 : 0),
    0
  );
}

async function ensureApprovalTable() {
  if (approvalTableReady) return;

  try {
    await dbQuery(`SELECT 1 FROM ${PRESCRIPTION_APPROVAL_TABLE} WHERE 1 = 0`);
    approvalTableReady = true;
    return;
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }
  }

  await dbQuery(`
    CREATE TABLE ${PRESCRIPTION_APPROVAL_TABLE} (
      ID NUMBER PRIMARY KEY,
      PRESCRIPTION_ID NUMBER NOT NULL UNIQUE,
      ASSIGNED_PHARMACIST_ID NUMBER,
      STATUS VARCHAR2(20 CHAR) DEFAULT 'PENDING' NOT NULL,
      REQUESTED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      DECIDED_AT TIMESTAMP,
      DECIDED_BY_USER_ID NUMBER,
      NOTES VARCHAR2(1000 CHAR),
      CONSTRAINT CK_PRESC_APPROVAL_STATUS CHECK (STATUS IN ('PENDING', 'APPROVED', 'REJECTED'))
    )
  `);

  try {
    await dbQuery(
      `CREATE INDEX IDX_PRESC_APPROVAL_STATUS ON ${PRESCRIPTION_APPROVAL_TABLE} (STATUS, ASSIGNED_PHARMACIST_ID)`
    );
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  approvalTableReady = true;
}

async function ensureMedicalRequestTable() {
  if (medicalRequestTableReady) return;

  try {
    await dbQuery(`SELECT 1 FROM ${PRESCRIPTION_REQUEST_TABLE} WHERE 1 = 0`);
    medicalRequestTableReady = true;
    return;
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }
  }

  await dbQuery(`
    CREATE TABLE ${PRESCRIPTION_REQUEST_TABLE} (
      ID NUMBER PRIMARY KEY,
      PRESCRIPTION_ID NUMBER NOT NULL,
      REQUEST_TYPE VARCHAR2(20 CHAR) NOT NULL,
      REQUEST_LABEL VARCHAR2(500 CHAR) NOT NULL,
      REQUEST_NOTES VARCHAR2(1000 CHAR),
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT CK_PRESC_REQ_TYPE CHECK (REQUEST_TYPE IN ('RADIO', 'ANALYSIS'))
    )
  `);

  try {
    await dbQuery(
      `CREATE INDEX IDX_PRESC_REQ_PRESC ON ${PRESCRIPTION_REQUEST_TABLE} (PRESCRIPTION_ID, REQUEST_TYPE)`
    );
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  medicalRequestTableReady = true;
}

async function getPrescriptionHeaderSelect() {
  await ensureApprovalTable();
  await ensureMedicalRequestTable();

  return `
    SELECT
      p.ID AS prescription_id,
      p.AGENT_ID AS agent_id,
      p.AGENT_SITUATION AS agent_situation,
      p.DISTRIBUTED AS distributed,
      p.PRESCRIPTION_DATE AS prescription_date,
      p.PRESCRIPTION_NUMBER AS prescription_number,
      p.TYPE AS type,
      p.DOCTOR_ID AS doctor_id,
      d.NAME AS doctor_name,
      pa.STATUS AS approval_status,
      pa.REQUESTED_AT AS approval_requested_at,
      pa.DECIDED_AT AS approval_decided_at,
      pa.NOTES AS approval_notes,
      pa.ASSIGNED_PHARMACIST_ID AS assigned_pharmacist_id,
      pu.FIRSTNAME AS assigned_pharmacist_firstname,
      pu.LASTNAME AS assigned_pharmacist_lastname,
      pu.USERNAME AS assigned_pharmacist_username
    FROM ${PRESCRIPTION_TABLE} p
    LEFT JOIN ${DOCTOR_TABLE} d ON d.ID = p.DOCTOR_ID
    LEFT JOIN ${PRESCRIPTION_APPROVAL_TABLE} pa ON pa.PRESCRIPTION_ID = p.ID
    LEFT JOIN ${USERS_TABLE} pu ON pu.ID = pa.ASSIGNED_PHARMACIST_ID
  `;
}

function isDoctorUser(user) {
  return Array.isArray(user?.roles) && user.roles.includes(ROLE_KEYS.MEDECIN);
}

function isPharmacienUser(user) {
  return Array.isArray(user?.roles) && user.roles.includes(ROLE_KEYS.PHARMACIEN);
}

async function requireConnectedDoctor(user) {
  const connectedDoctor = await resolveDoctorForUser(user);

  if (!connectedDoctor) {
    const error = new Error("No active doctor profile is linked to this account.");
    error.status = 403;
    error.details = {
      doctor: "Ask an administrator to create or reactivate the doctor profile for this user.",
    };
    throw error;
  }

  return connectedDoctor;
}

async function buildPrescriptionFilters(query, user) {
  const clauses = [];
  const binds = {};

  if (isDoctorUser(user)) {
    const connectedDoctor = await requireConnectedDoctor(user);
    clauses.push("p.DOCTOR_ID = :connected_doctor_id");
    binds.connected_doctor_id = connectedDoctor.doctor_id;
  }

  if (query.doctor_id !== undefined) {
    if (isDoctorUser(user)) {
      const connectedDoctor = await requireConnectedDoctor(user);
      if (Number(query.doctor_id) !== connectedDoctor.doctor_id) {
        const error = new Error("Doctors can only access their own prescriptions.");
        error.status = 403;
        throw error;
      }
    }

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

  if (query.patient_name) {
    clauses.push(
      "(UPPER(NVL(p.AGENT_SITUATION, '')) LIKE UPPER(:patient_name) OR UPPER(TO_CHAR(p.AGENT_ID)) LIKE UPPER(:patient_name))"
    );
    binds.patient_name = `%${query.patient_name}%`;
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

async function getPrescriptionMedicalRequests(prescriptionIds) {
  if (prescriptionIds.length === 0) return [];

  await ensureMedicalRequestTable();

  const rows = [];

  for (const idsChunk of chunkValues(prescriptionIds)) {
    const bindNames = idsChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(idsChunk.map((id, index) => [`id${index}`, id]));

    const result = await dbQuery(
      `
      SELECT
        r.ID AS request_id,
        r.PRESCRIPTION_ID AS prescription_id,
        r.REQUEST_TYPE AS request_type,
        r.REQUEST_LABEL AS request_label,
        r.REQUEST_NOTES AS request_notes,
        r.CREATED_AT AS created_at
      FROM ${PRESCRIPTION_REQUEST_TABLE} r
      WHERE r.PRESCRIPTION_ID IN (${bindNames.map((name) => `:${name}`).join(", ")})
      ORDER BY r.PRESCRIPTION_ID DESC, r.ID ASC
      `,
      binds
    );

    rows.push(...result.rows);
  }

  return rows;
}

function mapPrescriptionHeader(header) {
  const pharmacistName = [
    header.ASSIGNED_PHARMACIST_FIRSTNAME,
    header.ASSIGNED_PHARMACIST_LASTNAME,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    prescription_id: header.PRESCRIPTION_ID,
    agent_id: header.AGENT_ID,
    agent_name: header.AGENT_SITUATION,
    agent_situation: header.AGENT_SITUATION,
    distributed: header.DISTRIBUTED,
    prescription_date: header.PRESCRIPTION_DATE,
    prescription_number: header.PRESCRIPTION_NUMBER,
    type: header.TYPE,
    doctor_id: header.DOCTOR_ID,
    doctor_name: header.DOCTOR_NAME,
    approval: {
      status: header.APPROVAL_STATUS || "PENDING",
      requested_at: header.APPROVAL_REQUESTED_AT || null,
      decided_at: header.APPROVAL_DECIDED_AT || null,
      notes: header.APPROVAL_NOTES || null,
      assigned_pharmacist_id: header.ASSIGNED_PHARMACIST_ID || null,
      assigned_pharmacist_name: pharmacistName || null,
      assigned_pharmacist_username: header.ASSIGNED_PHARMACIST_USERNAME || null,
    },
  };
}

function attachLines(headers, lines, medicalRequests = []) {
  const linesByPrescriptionId = new Map();
  const requestsByPrescriptionId = new Map();

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

  for (const request of medicalRequests) {
    const key = request.PRESCRIPTION_ID;
    if (!requestsByPrescriptionId.has(key)) requestsByPrescriptionId.set(key, []);

    requestsByPrescriptionId.get(key).push({
      request_id: request.REQUEST_ID,
      type: request.REQUEST_TYPE,
      label: request.REQUEST_LABEL,
      notes: request.REQUEST_NOTES,
      created_at: request.CREATED_AT,
    });
  }

  return headers.map((header) => {
    const item = mapPrescriptionHeader(header);
    const medicalRequestsForItem = requestsByPrescriptionId.get(header.PRESCRIPTION_ID) || [];

    return {
      ...item,
      lines: linesByPrescriptionId.get(header.PRESCRIPTION_ID) || [],
      medical_requests: medicalRequestsForItem,
      radios: medicalRequestsForItem.filter((request) => request.type === "RADIO").map((request) => request.label),
      analyses: medicalRequestsForItem.filter((request) => request.type === "ANALYSIS").map((request) => request.label),
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

async function pickPharmacistForApproval(conn, agentSituation) {
  const situationTokens = extractLocationTokens(agentSituation);

  const result = await conn.execute(
    `SELECT
      u.ID AS user_id,
      u.FUNCTION AS function_name,
      NVL(p.pending_count, 0) AS pending_count,
      p.last_requested_at AS last_requested_at
     FROM ${USERS_TABLE} u
     INNER JOIN ${USER_ROLES_TABLE} ur ON ur.USER_ID = u.ID
     LEFT JOIN (
       SELECT
         pa.ASSIGNED_PHARMACIST_ID AS user_id,
          COUNT(*) AS pending_count,
          MAX(pa.REQUESTED_AT) AS last_requested_at
       FROM ${PRESCRIPTION_APPROVAL_TABLE} pa
       WHERE pa.STATUS = 'PENDING'
       GROUP BY pa.ASSIGNED_PHARMACIST_ID
     ) p ON p.user_id = u.ID
     WHERE ur.ROLES_ID = :role_id
       AND NVL(u.ACTIVED, 1) = 1`,
    { role_id: PHARMACIEN_ROLE_ID }
  );

  const pharmacists = result.rows.map((row) => ({
    user_id: Number(row.USER_ID),
    function_name: row.FUNCTION_NAME || "",
    pending_count: Number(row.PENDING_COUNT || 0),
    last_requested_at: row.LAST_REQUESTED_AT || null,
    location_score: scoreLocationMatch(situationTokens, row.FUNCTION_NAME),
  }));

  if (pharmacists.length === 0) {
    return null;
  }

  pharmacists.sort((a, b) => {
    if (b.location_score !== a.location_score) {
      return b.location_score - a.location_score;
    }

    if (a.pending_count !== b.pending_count) {
      return a.pending_count - b.pending_count;
    }

    const aTime = a.last_requested_at ? new Date(a.last_requested_at).getTime() : 0;
    const bTime = b.last_requested_at ? new Date(b.last_requested_at).getTime() : 0;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.user_id - b.user_id;
  });

  return pharmacists[0] || null;
}

async function requirePharmacienOrThrow(user) {
  if (!isPharmacienUser(user)) {
    const error = new Error("Only pharmacist users can approve prescriptions.");
    error.status = 403;
    throw error;
  }
}

async function getPrescriptionItemById(prescriptionId) {
  const prescriptionHeaderSelect = await getPrescriptionHeaderSelect();
  const headerResult = await dbQuery(`${prescriptionHeaderSelect} WHERE p.ID = :id`, {
    id: prescriptionId,
  });

  if (headerResult.rows.length === 0) {
    return null;
  }

  const lines = await getPrescriptionLines([prescriptionId]);
  const medicalRequests = await getPrescriptionMedicalRequests([prescriptionId]);
  const [item] = attachLines(headerResult.rows, lines, medicalRequests);
  return item;
}

export async function listPrescriptions(req, res) {
  const { where, binds } = await buildPrescriptionFilters(req.query, req.user);
  const prescriptionHeaderSelect = await getPrescriptionHeaderSelect();

  const result = await runPaginatedQuery({
    baseSql: `${prescriptionHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY p.PRESCRIPTION_DATE DESC, p.ID DESC",
    query: req.query,
  });

  const lines = await getPrescriptionLines(result.items.map((header) => header.PRESCRIPTION_ID));
  const medicalRequests = await getPrescriptionMedicalRequests(
    result.items.map((header) => header.PRESCRIPTION_ID)
  );

  return res.json({
    items: attachLines(result.items, lines, medicalRequests),
    pagination: result.pagination,
  });
}

export async function getPrescriptionById(req, res) {
  const prescriptionHeaderSelect = await getPrescriptionHeaderSelect();
  const headerResult = await dbQuery(`${prescriptionHeaderSelect} WHERE p.ID = :id`, { id: req.params.id });

  if (headerResult.rows.length === 0) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  if (isDoctorUser(req.user)) {
    const connectedDoctor = await requireConnectedDoctor(req.user);
    const prescriptionDoctorId = Number(headerResult.rows[0].DOCTOR_ID);

    if (prescriptionDoctorId !== connectedDoctor.doctor_id) {
      return res.status(403).json({ message: "Forbidden" });
    }
  }

  const lines = await getPrescriptionLines([req.params.id]);
  const medicalRequests = await getPrescriptionMedicalRequests([req.params.id]);
  const [item] = attachLines(headerResult.rows, lines, medicalRequests);
  return res.json({ item });
}

export async function createPrescription(req, res) {
  const requestedDoctorId = Number(req.body.doctor_id);
  let doctorId = requestedDoctorId;

  if (isDoctorUser(req.user)) {
    const connectedDoctor = await requireConnectedDoctor(req.user);
    if (requestedDoctorId !== connectedDoctor.doctor_id) {
      return res.status(403).json({
        message: "Doctors can only create prescriptions for their own profile.",
      });
    }

    doctorId = connectedDoctor.doctor_id;
  }

  await assertDoctorExists(doctorId);
  await assertProductsExist(req.body.lines.map((line) => line.product_id));
  await ensureApprovalTable();
  await ensureMedicalRequestTable();

  const pool = await initDb();
  const conn = await pool.getConnection();

  let prescriptionId;

  try {
    prescriptionId = await getNextIdWithTableLock(conn, PRESCRIPTION_TABLE);

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

    let nextLineId = await getNextIdWithTableLock(conn, PRESCRIPTION_LINE_TABLE);

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

    let nextRequestId = await getNextIdWithTableLock(conn, PRESCRIPTION_REQUEST_TABLE);
    const radioRequests = Array.isArray(req.body.radios) ? req.body.radios : [];
    const analysisRequests = Array.isArray(req.body.analyses) ? req.body.analyses : [];

    for (const radioLabel of radioRequests) {
      await conn.execute(
        `INSERT INTO ${PRESCRIPTION_REQUEST_TABLE} (
          ID,
          PRESCRIPTION_ID,
          REQUEST_TYPE,
          REQUEST_LABEL,
          REQUEST_NOTES,
          CREATED_AT
        ) VALUES (
          :id,
          :prescription_id,
          'RADIO',
          :request_label,
          NULL,
          SYSTIMESTAMP
        )`,
        {
          id: nextRequestId,
          prescription_id: prescriptionId,
          request_label: radioLabel,
        },
        { autoCommit: false }
      );

      nextRequestId += 1;
    }

    for (const analysisLabel of analysisRequests) {
      await conn.execute(
        `INSERT INTO ${PRESCRIPTION_REQUEST_TABLE} (
          ID,
          PRESCRIPTION_ID,
          REQUEST_TYPE,
          REQUEST_LABEL,
          REQUEST_NOTES,
          CREATED_AT
        ) VALUES (
          :id,
          :prescription_id,
          'ANALYSIS',
          :request_label,
          NULL,
          SYSTIMESTAMP
        )`,
        {
          id: nextRequestId,
          prescription_id: prescriptionId,
          request_label: analysisLabel,
        },
        { autoCommit: false }
      );

      nextRequestId += 1;
    }

    const approvalId = await getNextIdWithTableLock(conn, PRESCRIPTION_APPROVAL_TABLE);
    const assignedPharmacist = await pickPharmacistForApproval(conn, req.body.agent_situation);

    await conn.execute(
      `INSERT INTO ${PRESCRIPTION_APPROVAL_TABLE} (
        ID,
        PRESCRIPTION_ID,
        ASSIGNED_PHARMACIST_ID,
        STATUS,
        REQUESTED_AT,
        NOTES
      ) VALUES (
        :id,
        :prescription_id,
        :assigned_pharmacist_id,
        'PENDING',
        SYSTIMESTAMP,
        NULL
      )`,
      {
        id: approvalId,
        prescription_id: prescriptionId,
        assigned_pharmacist_id: assignedPharmacist?.user_id || null,
      },
      { autoCommit: false }
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const item = await getPrescriptionItemById(prescriptionId);
  return res.status(201).json({ item });
}

export async function getPatientCard(req, res) {
  const agentId = String(req.params.agentId).trim();
  const filters = ["p.AGENT_ID = :agent_id"];
  const binds = { agent_id: agentId };

  if (isDoctorUser(req.user)) {
    const connectedDoctor = await requireConnectedDoctor(req.user);
    filters.push("p.DOCTOR_ID = :doctor_id");
    binds.doctor_id = connectedDoctor.doctor_id;
  }

  const where = `WHERE ${filters.join(" AND ")}`;

  const summaryResult = await dbQuery(
    `SELECT
      COUNT(*) AS total_prescriptions,
      MAX(p.PRESCRIPTION_DATE) AS last_prescription_date,
      MAX(p.PRESCRIPTION_NUMBER) KEEP (DENSE_RANK LAST ORDER BY p.PRESCRIPTION_DATE NULLS LAST, p.ID) AS last_prescription_number,
      MAX(p.AGENT_SITUATION) KEEP (DENSE_RANK LAST ORDER BY p.PRESCRIPTION_DATE NULLS LAST, p.ID) AS latest_agent_situation
     FROM ${PRESCRIPTION_TABLE} p
     ${where}`,
    binds
  );

  const summary = summaryResult.rows[0];

  const prescriptionHeaderSelect = await getPrescriptionHeaderSelect();
  const historyResult = await dbQuery(
    `${prescriptionHeaderSelect}
     ${where}
     ORDER BY p.PRESCRIPTION_DATE DESC NULLS LAST, p.ID DESC
     FETCH FIRST 20 ROWS ONLY`,
    binds
  );

  const historyIds = historyResult.rows.map((row) => row.PRESCRIPTION_ID);
  const lines = await getPrescriptionLines(historyIds);
  const medicalRequests = await getPrescriptionMedicalRequests(historyIds);

  return res.json({
    agent_id: agentId,
    agent_name: summary?.LATEST_AGENT_SITUATION || null,
    agent_situation: summary?.LATEST_AGENT_SITUATION || null,
    total_prescriptions: Number(summary?.TOTAL_PRESCRIPTIONS || 0),
    last_prescription_date: summary?.LAST_PRESCRIPTION_DATE || null,
    last_prescription_number: summary?.LAST_PRESCRIPTION_NUMBER || null,
    history: attachLines(historyResult.rows, lines, medicalRequests),
  });
}

export async function listPendingApprovals(req, res) {
  await ensureApprovalTable();
  await requirePharmacienOrThrow(req.user);

  const userId = Number(req.user?.sub);

  const result = await dbQuery(
    `SELECT
      pa.PRESCRIPTION_ID AS prescription_id,
      pa.REQUESTED_AT AS requested_at,
      pa.ASSIGNED_PHARMACIST_ID AS assigned_pharmacist_id,
      p.PRESCRIPTION_NUMBER AS prescription_number,
      p.PRESCRIPTION_DATE AS prescription_date,
      p.TYPE AS type,
      p.AGENT_ID AS agent_id,
      p.AGENT_SITUATION AS agent_situation,
      d.NAME AS doctor_name,
      p.DOCTOR_ID AS doctor_id
     FROM ${PRESCRIPTION_APPROVAL_TABLE} pa
     INNER JOIN ${PRESCRIPTION_TABLE} p ON p.ID = pa.PRESCRIPTION_ID
     LEFT JOIN ${DOCTOR_TABLE} d ON d.ID = p.DOCTOR_ID
     WHERE pa.STATUS = 'PENDING'
       AND (pa.ASSIGNED_PHARMACIST_ID = :user_id OR pa.ASSIGNED_PHARMACIST_ID IS NULL)
     ORDER BY pa.REQUESTED_AT ASC, p.PRESCRIPTION_DATE DESC, p.ID DESC`,
    { user_id: userId }
  );

  const prescriptionIds = result.rows.map((row) => row.PRESCRIPTION_ID);
  const lines = await getPrescriptionLines(prescriptionIds);
  const lineCountByPrescriptionId = new Map();

  for (const line of lines) {
    lineCountByPrescriptionId.set(
      line.PRESCRIPTION_ID,
      (lineCountByPrescriptionId.get(line.PRESCRIPTION_ID) || 0) + 1
    );
  }

  return res.json({
    items: result.rows.map((row) => ({
      prescription_id: row.PRESCRIPTION_ID,
      requested_at: row.REQUESTED_AT,
      assigned_pharmacist_id: row.ASSIGNED_PHARMACIST_ID,
      prescription_number: row.PRESCRIPTION_NUMBER,
      prescription_date: row.PRESCRIPTION_DATE,
      type: row.TYPE,
      doctor_id: row.DOCTOR_ID,
      doctor_name: row.DOCTOR_NAME,
      agent_id: row.AGENT_ID,
      agent_situation: row.AGENT_SITUATION,
      line_count: lineCountByPrescriptionId.get(row.PRESCRIPTION_ID) || 0,
    })),
  });
}

export async function approvePrescription(req, res) {
  await ensureApprovalTable();
  await requirePharmacienOrThrow(req.user);

  const prescriptionId = Number(req.params.id);
  const userId = Number(req.user?.sub);
  const { decision, notes } = req.body;

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const approvalRes = await conn.execute(
      `SELECT ID, STATUS, ASSIGNED_PHARMACIST_ID
       FROM ${PRESCRIPTION_APPROVAL_TABLE}
       WHERE PRESCRIPTION_ID = :prescription_id
       FOR UPDATE`,
      { prescription_id: prescriptionId }
    );

    if (approvalRes.rows.length === 0) {
      const approvalId = await getNextIdWithTableLock(conn, PRESCRIPTION_APPROVAL_TABLE);
      await conn.execute(
        `INSERT INTO ${PRESCRIPTION_APPROVAL_TABLE} (
          ID,
          PRESCRIPTION_ID,
          ASSIGNED_PHARMACIST_ID,
          STATUS,
          REQUESTED_AT,
          NOTES
        ) VALUES (
          :id,
          :prescription_id,
          :assigned_pharmacist_id,
          'PENDING',
          SYSTIMESTAMP,
          NULL
        )`,
        {
          id: approvalId,
          prescription_id: prescriptionId,
          assigned_pharmacist_id: userId,
        },
        { autoCommit: false }
      );
    }

    const currentRes = await conn.execute(
      `SELECT ID, STATUS, ASSIGNED_PHARMACIST_ID
       FROM ${PRESCRIPTION_APPROVAL_TABLE}
       WHERE PRESCRIPTION_ID = :prescription_id
       FOR UPDATE`,
      { prescription_id: prescriptionId }
    );

    if (currentRes.rows.length === 0) {
      const error = new Error("Prescription approval record not found.");
      error.status = 404;
      throw error;
    }

    const current = currentRes.rows[0];

    if (current.STATUS !== "PENDING") {
      const error = new Error("This prescription is already processed.");
      error.status = 409;
      throw error;
    }

    const assignedPharmacistId = current.ASSIGNED_PHARMACIST_ID;
    if (assignedPharmacistId && Number(assignedPharmacistId) !== userId) {
      const error = new Error("This prescription is assigned to another pharmacist.");
      error.status = 403;
      throw error;
    }

    await conn.execute(
      `UPDATE ${PRESCRIPTION_APPROVAL_TABLE}
       SET ASSIGNED_PHARMACIST_ID = :assigned_pharmacist_id,
           STATUS = :status,
           DECIDED_AT = SYSTIMESTAMP,
           DECIDED_BY_USER_ID = :decided_by_user_id,
           NOTES = :notes
       WHERE PRESCRIPTION_ID = :prescription_id`,
      {
        assigned_pharmacist_id: userId,
        status: decision,
        decided_by_user_id: userId,
        notes: notes || null,
        prescription_id: prescriptionId,
      },
      { autoCommit: false }
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const item = await getPrescriptionItemById(prescriptionId);

  if (!item) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  return res.json({ item });
}

export async function listPrescriptionDoctors(req, res) {
  const activedExpression = await getDoctorActivedExpression("d");
  const hasActived = await hasDoctorActivedColumn();
  const isDoctor = isDoctorUser(req.user);
  const doctorFilter = [];
  const binds = {};

  if (hasActived) {
    doctorFilter.push("NVL(d.ACTIVED, 1) = 1");
  }

  if (isDoctor) {
    const connectedDoctor = await requireConnectedDoctor(req.user);
    doctorFilter.push("d.ID = :doctor_id");
    binds.doctor_id = connectedDoctor.doctor_id;
  }

  const result = await dbQuery(
    `SELECT
      d.ID AS doctor_id,
      d.NAME AS name,
      d.SPECIALTY AS specialty,
      d.ADDRESS AS address,
      d.TEL AS tel,
      ${activedExpression} AS actived
     FROM ${DOCTOR_TABLE} d
     ${doctorFilter.length > 0 ? `WHERE ${doctorFilter.join(" AND ")}` : ""}
     ORDER BY d.NAME, d.ID`,
    binds
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
  if (isDoctorUser(req.user)) {
    await requireConnectedDoctor(req.user);
  }

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
      agent_name: row.AGENT_SITUATION,
      agent_situation: row.AGENT_SITUATION,
    })),
  });
}

export async function listPrescriptionTypes(req, res) {
  if (isDoctorUser(req.user)) {
    await requireConnectedDoctor(req.user);
  }

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
