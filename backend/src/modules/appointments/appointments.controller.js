import { dbQuery, initDb } from "../../config/db.js";
import { getNextIdWithTableLock } from "../../utils/oracleIds.js";
import { ROLE_KEYS } from "../../utils/rbac.js";
import { DOCTOR_TABLE, getDoctorActivedExpression, resolveDoctorForUser } from "../../utils/doctorProfiles.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const AGENT_TABLE = withSchema("AGENT");
const APPOINTMENT_TABLE = withSchema("APPOINTMENT");
const APPOINTMENT_BLOCK_TABLE = withSchema("APPOINTMENT_BLOCK");
const APPOINTMENT_RESCHEDULE_REQUEST_TABLE = withSchema("APPOINTMENT_RESCHEDULE_REQUEST");
let appointmentTableReady = false;
let appointmentBlockTableReady = false;
let appointmentRescheduleRequestTableReady = false;

function mapAppointment(row) {
  return {
    id: Number(row.ID),
    agent_id: Number(row.AGENT_ID),
    agent_name: row.AGENT_NAME,
    doctor_id: Number(row.DOCTOR_ID),
    doctor_name: row.DOCTOR_NAME,
    appointment_at: row.APPOINTMENT_AT,
    status: row.STATUS,
    notes: row.NOTES,
    created_at: row.CREATED_AT,
    updated_at: row.UPDATED_AT,
  };
}

async function ensureAppointmentTable() {
  if (appointmentTableReady) return;

  try {
    await dbQuery(`SELECT 1 FROM ${APPOINTMENT_TABLE} WHERE 1 = 0`);
    appointmentTableReady = true;
    return;
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }
  }

  await dbQuery(`
    CREATE TABLE ${APPOINTMENT_TABLE} (
      ID NUMBER PRIMARY KEY,
      AGENT_ID NUMBER NOT NULL,
      AGENT_NAME VARCHAR2(255 CHAR) NOT NULL,
      DOCTOR_ID NUMBER NOT NULL,
      DOCTOR_NAME VARCHAR2(255 CHAR) NOT NULL,
      APPOINTMENT_AT TIMESTAMP NOT NULL,
      STATUS VARCHAR2(20 CHAR) DEFAULT 'SCHEDULED' NOT NULL,
      NOTES VARCHAR2(1000 CHAR),
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CREATED_BY_USER_ID NUMBER,
      UPDATED_BY_USER_ID NUMBER,
      CONSTRAINT CK_APPOINTMENT_STATUS CHECK (STATUS IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELED'))
    )
  `);

  try {
    await dbQuery(`CREATE INDEX IDX_APPOINTMENT_DOCTOR ON ${APPOINTMENT_TABLE} (DOCTOR_ID, APPOINTMENT_AT)`);
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  try {
    await dbQuery(`CREATE INDEX IDX_APPOINTMENT_AGENT ON ${APPOINTMENT_TABLE} (AGENT_ID, APPOINTMENT_AT)`);
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  appointmentTableReady = true;
}

async function ensureAppointmentSequence() {
  try {
    await dbQuery(`SELECT 1 FROM USER_SEQUENCES WHERE SEQUENCE_NAME = 'APPOINTMENT_SEQ'`);
  } catch {
    // Ignore lookup errors and try to create the sequence.
  }

  try {
    await dbQuery(`CREATE SEQUENCE ${withSchema("APPOINTMENT_SEQ")} START WITH 1 INCREMENT BY 1 NOCYCLE`);
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }
}

async function ensureAppointmentInfrastructure() {
  await ensureAppointmentTable();
  await ensureAppointmentSequence();
}

async function ensureAppointmentBlockTable() {
  if (appointmentBlockTableReady) return;

  try {
    await dbQuery(`SELECT 1 FROM ${APPOINTMENT_BLOCK_TABLE} WHERE 1 = 0`);
    appointmentBlockTableReady = true;
    return;
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }
  }

  await dbQuery(`
    CREATE TABLE ${APPOINTMENT_BLOCK_TABLE} (
      ID NUMBER PRIMARY KEY,
      DOCTOR_ID NUMBER NOT NULL,
      START_AT TIMESTAMP NOT NULL,
      END_AT TIMESTAMP NOT NULL,
      REASON VARCHAR2(1000 CHAR),
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CREATED_BY_USER_ID NUMBER,
      UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      UPDATED_BY_USER_ID NUMBER,
      CONSTRAINT CK_APPOINTMENT_BLOCK_RANGE CHECK (END_AT > START_AT)
    )
  `);

  try {
    await dbQuery(`CREATE INDEX IDX_APPOINTMENT_BLOCK_DOCTOR ON ${APPOINTMENT_BLOCK_TABLE} (DOCTOR_ID, START_AT, END_AT)`);
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  appointmentBlockTableReady = true;
}

async function ensureAppointmentRescheduleRequestTable() {
  if (appointmentRescheduleRequestTableReady) return;

  try {
    await dbQuery(`SELECT 1 FROM ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE} WHERE 1 = 0`);
    appointmentRescheduleRequestTableReady = true;
    return;
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }
  }

  await dbQuery(`
    CREATE TABLE ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE} (
      ID NUMBER PRIMARY KEY,
      APPOINTMENT_ID NUMBER NOT NULL,
      DOCTOR_ID NUMBER NOT NULL,
      SUGGESTED_AT TIMESTAMP NOT NULL,
      REASON VARCHAR2(1000 CHAR),
      STATUS VARCHAR2(20 CHAR) DEFAULT 'PENDING' NOT NULL,
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CREATED_BY_USER_ID NUMBER,
      DECIDED_AT TIMESTAMP,
      DECIDED_BY_USER_ID NUMBER,
      CONSTRAINT CK_APPT_RESCHEDULE_STATUS CHECK (STATUS IN ('PENDING', 'APPROVED', 'REJECTED'))
    )
  `);

  try {
    await dbQuery(`CREATE INDEX IDX_APPT_RESCHEDULE_APPT ON ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE} (APPOINTMENT_ID, STATUS)`);
  } catch (error) {
    if (error?.errorNum !== 955) {
      throw error;
    }
  }

  appointmentRescheduleRequestTableReady = true;
}

async function ensureAppointmentWorkflowInfrastructure() {
  await ensureAppointmentInfrastructure();
  await ensureAppointmentBlockTable();
  await ensureAppointmentRescheduleRequestTable();
}

function formatAppointmentDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function formatTimestampForOracleBind(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function parseAppointmentDate(dateValue, timeValue) {
  const dateText = String(dateValue || "").trim();
  if (!dateText) return null;
  const timeText = String(timeValue || "").trim() || "00:00";
  return `${dateText} ${timeText}`;
}

function parseIsoTimestamp(dateValue, timeValue = "00:00") {
  const dateText = String(dateValue || "").trim();
  if (!dateText) return null;
  const timeText = String(timeValue || "").trim() || "00:00";
  return `${dateText} ${timeText}`;
}

function isSecretaryOrAdmin(user) {
  return Boolean(
    user?.roles?.includes(ROLE_KEYS.SECRETAIRE_GENERAL) ||
      user?.roles?.includes(ROLE_KEYS.ADMIN)
  );
}

function canViewAppointmentBlocks(user) {
  return Boolean(
    user?.roles?.includes(ROLE_KEYS.MEDECIN) ||
      user?.roles?.includes(ROLE_KEYS.SECRETAIRE_GENERAL) ||
      user?.roles?.includes(ROLE_KEYS.ADMIN)
  );
}

function canEditAppointmentBlocks(user) {
  return Boolean(
    user?.roles?.includes(ROLE_KEYS.MEDECIN) ||
      user?.roles?.includes(ROLE_KEYS.ADMIN)
  );
}

async function resolveDoctorIdForCurrentUser(user) {
  const connectedDoctor = await resolveDoctorForUser(user);
  return connectedDoctor?.doctor_id ?? null;
}

function isDoctorUser(user) {
  return Boolean(user?.roles?.includes(ROLE_KEYS.MEDECIN));
}

function isDoctorOrSecretaryOrAdmin(user) {
  return Boolean(
    user?.roles?.includes(ROLE_KEYS.MEDECIN) ||
      user?.roles?.includes(ROLE_KEYS.SECRETAIRE_GENERAL) ||
      user?.roles?.includes(ROLE_KEYS.ADMIN)
  );
}

async function assertAppointmentSlotAllowed({ doctorId, appointmentAt, ignoreAppointmentId = null }) {
  const conflictResult = await dbQuery(
    `SELECT ID, START_AT, END_AT, REASON
     FROM ${APPOINTMENT_BLOCK_TABLE}
     WHERE DOCTOR_ID = :doctor_id
       AND START_AT <= TO_TIMESTAMP(:appointment_at, 'YYYY-MM-DD HH24:MI')
       AND END_AT > TO_TIMESTAMP(:appointment_at, 'YYYY-MM-DD HH24:MI')
     ORDER BY START_AT DESC
     FETCH FIRST 1 ROWS ONLY`,
    {
      doctor_id: doctorId,
      appointment_at: appointmentAt,
    }
  );

  if (conflictResult.rows.length > 0) {
    const conflict = conflictResult.rows[0];
    const error = new Error("Appointment slot is blocked for this doctor.");
    error.status = 409;
    error.details = {
      blocked: {
        id: conflict.ID,
        start_at: conflict.START_AT,
        end_at: conflict.END_AT,
        reason: conflict.REASON,
      },
      appointment_id: ignoreAppointmentId,
    };
    throw error;
  }
}

async function assertDoctorHasAppointmentForPrescription({ doctorId, agentId }) {
  const result = await dbQuery(
    `SELECT ID, STATUS
     FROM ${APPOINTMENT_TABLE}
     WHERE DOCTOR_ID = :doctor_id
       AND AGENT_ID = :agent_id
       AND STATUS <> 'CANCELED'
     ORDER BY APPOINTMENT_AT DESC, ID DESC
     FETCH FIRST 1 ROWS ONLY`,
    {
      doctor_id: doctorId,
      agent_id: agentId,
    }
  );

  if (result.rows.length === 0) {
    const error = new Error("The doctor can create prescriptions only after an existing appointment for this agent.");
    error.status = 409;
    error.details = {
      appointment: "No active appointment exists for this agent and doctor.",
    };
    throw error;
  }

  return result.rows[0];
}

export async function listAppointmentResources(req, res) {
  await ensureAppointmentInfrastructure();
  const agentResult = await dbQuery(
    `SELECT ID, NAME, SITUATION
     FROM ${AGENT_TABLE}
     ORDER BY ID DESC
     FETCH FIRST 300 ROWS ONLY`
  );

  const doctorActivedExpression = await getDoctorActivedExpression("d");
  const doctorResult = await dbQuery(
    `SELECT
       d.ID,
       d.NAME,
       d.SPECIALTY,
       ${doctorActivedExpression} AS ACTIVED
     FROM ${DOCTOR_TABLE} d
     ORDER BY d.ID DESC
     FETCH FIRST 300 ROWS ONLY`
  );

  return res.json({
    current_doctor_id: await resolveDoctorIdForCurrentUser(req.user),
    agents: agentResult.rows.map((row) => ({
      agent_id: row.ID,
      agent_name: row.NAME,
      agent_situation: row.SITUATION,
    })),
    doctors: doctorResult.rows.map((row) => ({
      doctor_id: row.ID,
      doctor_name: row.NAME,
      specialty: row.SPECIALTY,
      actived: row.ACTIVED,
    })),
  });
}

export async function listAppointments(req, res) {
  await ensureAppointmentInfrastructure();

  const canManage = isSecretaryOrAdmin(req.user);
  const connectedDoctorId = await resolveDoctorIdForCurrentUser(req.user);
  const clauses = [];
  const binds = {};

  if (!canManage && req.user?.roles?.includes(ROLE_KEYS.MEDECIN)) {
    if (!connectedDoctorId) {
      return res.status(403).json({ message: "No active doctor profile is linked to this account." });
    }

    clauses.push("a.DOCTOR_ID = :doctor_id");
    binds.doctor_id = connectedDoctorId;
  }

  if (req.query.status) {
    clauses.push("a.STATUS = :status");
    binds.status = String(req.query.status).trim().toUpperCase();
  }

  if (req.query.agent_id !== undefined) {
    const agentId = normalizeNumber(req.query.agent_id);
    if (agentId !== null) {
      clauses.push("a.AGENT_ID = :agent_id");
      binds.agent_id = agentId;
    }
  }

  if (req.query.doctor_id !== undefined && canManage) {
    const doctorId = normalizeNumber(req.query.doctor_id);
    if (doctorId !== null) {
      clauses.push("a.DOCTOR_ID = :filter_doctor_id");
      binds.filter_doctor_id = doctorId;
    }
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await dbQuery(
    `SELECT
       a.ID,
       a.AGENT_ID,
       a.AGENT_NAME,
       a.DOCTOR_ID,
       a.DOCTOR_NAME,
       a.APPOINTMENT_AT,
       a.STATUS,
       a.NOTES,
       a.CREATED_AT,
       a.UPDATED_AT
     FROM ${APPOINTMENT_TABLE} a
     ${where}
     ORDER BY a.APPOINTMENT_AT DESC, a.ID DESC`,
    binds
  );

  return res.json({ items: result.rows.map(mapAppointment) });
}

export async function createAppointment(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  const body = req.body;
  if (!body.agent_id || !body.doctor_id || !body.date) {
    return res.status(400).json({ message: "agent_id, doctor_id and date are required" });
  }

  const appointmentAt = parseAppointmentDate(body.date, body.time);
  if (!appointmentAt) {
    return res.status(400).json({ message: "date is required" });
  }

  await assertAppointmentSlotAllowed({
    doctorId: normalizeNumber(body.doctor_id),
    appointmentAt,
  });

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const id = await getNextIdWithTableLock(conn, APPOINTMENT_TABLE);
    await conn.execute(
      `INSERT INTO ${APPOINTMENT_TABLE} (
         ID,
         AGENT_ID,
         AGENT_NAME,
         DOCTOR_ID,
         DOCTOR_NAME,
         APPOINTMENT_AT,
         STATUS,
         NOTES,
         CREATED_BY_USER_ID,
         UPDATED_BY_USER_ID
       ) VALUES (
         :id,
         :agent_id,
         :agent_name,
         :doctor_id,
         :doctor_name,
         TO_TIMESTAMP(:appointment_at, 'YYYY-MM-DD HH24:MI'),
         :status,
         :notes,
         :created_by_user_id,
         :updated_by_user_id
       )`,
      {
        id,
        agent_id: normalizeNumber(body.agent_id),
        agent_name: String(body.agent_name || "").trim(),
        doctor_id: normalizeNumber(body.doctor_id),
        doctor_name: String(body.doctor_name || "").trim(),
        appointment_at: appointmentAt,
        status: String(body.status || "SCHEDULED").trim().toUpperCase(),
        notes: body.notes ? String(body.notes).trim() : null,
        created_by_user_id: req.user?.sub ?? null,
        updated_by_user_id: req.user?.sub ?? null,
      },
      { autoCommit: false }
    );

    await conn.commit();

    const result = await dbQuery(
      `SELECT
         a.ID,
         a.AGENT_ID,
         a.AGENT_NAME,
         a.DOCTOR_ID,
         a.DOCTOR_NAME,
         a.APPOINTMENT_AT,
         a.STATUS,
         a.NOTES,
         a.CREATED_AT,
         a.UPDATED_AT
       FROM ${APPOINTMENT_TABLE} a
       WHERE a.ID = :id`,
      { id }
    );

    return res.status(201).json({ item: mapAppointment(result.rows[0]) });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}

export async function updateAppointment(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  const id = normalizeNumber(req.params.id);
  const existing = await dbQuery(`SELECT ID FROM ${APPOINTMENT_TABLE} WHERE ID = :id`, { id });
  if (existing.rows.length === 0) return res.status(404).json({ message: "Not found" });

  const currentAppointmentResult = await dbQuery(
    `SELECT DOCTOR_ID, APPOINTMENT_AT
     FROM ${APPOINTMENT_TABLE}
     WHERE ID = :id`,
    { id }
  );
  const currentAppointment = currentAppointmentResult.rows[0] || null;

  const appointmentAt = parseAppointmentDate(req.body.date, req.body.time);
  const status = req.body.status ? String(req.body.status).trim().toUpperCase() : null;
  const updates = ["UPDATED_AT = SYSTIMESTAMP", "UPDATED_BY_USER_ID = :updated_by_user_id"];
  const binds = {
    id,
    updated_by_user_id: req.user?.sub ?? null,
  };

  if (req.body.agent_id !== undefined) {
    updates.push("AGENT_ID = :agent_id");
    binds.agent_id = normalizeNumber(req.body.agent_id);
  }

  if (req.body.agent_name !== undefined) {
    updates.push("AGENT_NAME = :agent_name");
    binds.agent_name = String(req.body.agent_name || "").trim();
  }

  if (req.body.doctor_id !== undefined) {
    updates.push("DOCTOR_ID = :doctor_id");
    binds.doctor_id = normalizeNumber(req.body.doctor_id);
  }

  if (req.body.doctor_name !== undefined) {
    updates.push("DOCTOR_NAME = :doctor_name");
    binds.doctor_name = String(req.body.doctor_name || "").trim();
  }

  if (appointmentAt) {
    updates.push("APPOINTMENT_AT = TO_TIMESTAMP(:appointment_at, 'YYYY-MM-DD HH24:MI')");
    binds.appointment_at = appointmentAt;
  }

  if (status) {
    updates.push("STATUS = :status");
    binds.status = status;
  }

  if (req.body.notes !== undefined) {
    updates.push("NOTES = :notes");
    binds.notes = String(req.body.notes || "").trim();
  }

  const nextDoctorId = binds.doctor_id ?? Number(currentAppointment?.DOCTOR_ID ?? null);
  const nextAppointmentAt = binds.appointment_at ?? formatTimestampForOracleBind(currentAppointment?.APPOINTMENT_AT);

  if (Number.isFinite(nextDoctorId) && nextAppointmentAt) {
    await assertAppointmentSlotAllowed({
      doctorId: nextDoctorId,
      appointmentAt: nextAppointmentAt,
      ignoreAppointmentId: id,
    });
  }

  await dbQuery(
    `UPDATE ${APPOINTMENT_TABLE}
     SET ${updates.join(",\n         ")}
     WHERE ID = :id`,
    binds
  );

  const result = await dbQuery(
    `SELECT
       a.ID,
       a.AGENT_ID,
       a.AGENT_NAME,
       a.DOCTOR_ID,
       a.DOCTOR_NAME,
       a.APPOINTMENT_AT,
       a.STATUS,
       a.NOTES,
       a.CREATED_AT,
       a.UPDATED_AT
     FROM ${APPOINTMENT_TABLE} a
     WHERE a.ID = :id`,
    { id }
  );

  return res.json({ item: mapAppointment(result.rows[0]) });
}

export async function deleteAppointment(req, res) {
  await ensureAppointmentInfrastructure();
  const id = normalizeNumber(req.params.id);
  const existing = await dbQuery(`SELECT ID FROM ${APPOINTMENT_TABLE} WHERE ID = :id`, { id });
  if (existing.rows.length === 0) return res.status(404).json({ message: "Not found" });

  await dbQuery(`DELETE FROM ${APPOINTMENT_TABLE} WHERE ID = :id`, { id });
  return res.json({ ok: true });
}

function normalizeBlockPayload(body) {
  const startAt = body.start_at || parseIsoTimestamp(body.start_date, body.start_time);
  const endAt = body.end_at || parseIsoTimestamp(body.end_date, body.end_time);

  return {
    doctorId: normalizeNumber(body.doctor_id),
    startAt: startAt ? String(startAt).replace("T", " ").slice(0, 16) : null,
    endAt: endAt ? String(endAt).replace("T", " ").slice(0, 16) : null,
    reason: body.reason ? String(body.reason).trim() : null,
  };
}

async function resolveCurrentDoctorForRequest(user) {
  if (!isDoctorUser(user)) return null;
  const connectedDoctorId = await resolveDoctorIdForCurrentUser(user);
  if (!connectedDoctorId) {
    const error = new Error("No active doctor profile is linked to this account.");
    error.status = 403;
    throw error;
  }
  return connectedDoctorId;
}

export async function listAppointmentBlocks(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  if (!canViewAppointmentBlocks(req.user)) {
    return res.status(403).json({ message: "You are not allowed to manage appointment blocks." });
  }

  const canManage = isDoctorOrSecretaryOrAdmin(req.user);
  const connectedDoctorId = await resolveCurrentDoctorForRequest(req.user);
  const clauses = [];
  const binds = {};

  if (connectedDoctorId && !canManage && req.user?.roles?.includes(ROLE_KEYS.MEDECIN)) {
    clauses.push("b.DOCTOR_ID = :doctor_id");
    binds.doctor_id = connectedDoctorId;
  }

  if (req.query.doctor_id !== undefined && canManage) {
    const doctorId = normalizeNumber(req.query.doctor_id);
    if (doctorId !== null) {
      clauses.push("b.DOCTOR_ID = :filter_doctor_id");
      binds.filter_doctor_id = doctorId;
    }
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await dbQuery(
    `SELECT ID, DOCTOR_ID, START_AT, END_AT, REASON, CREATED_AT, UPDATED_AT
     FROM ${APPOINTMENT_BLOCK_TABLE} b
     ${where}
     ORDER BY START_AT DESC, ID DESC`,
    binds
  );

  return res.json({
    items: result.rows.map((row) => ({
      id: Number(row.ID),
      doctor_id: Number(row.DOCTOR_ID),
      start_at: row.START_AT,
      end_at: row.END_AT,
      reason: row.REASON,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT,
    })),
  });
}

export async function createAppointmentBlock(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  if (!canEditAppointmentBlocks(req.user)) {
    return res.status(403).json({ message: "You are not allowed to manage appointment blocks." });
  }

  const payload = normalizeBlockPayload(req.body);
  const doctorId = await resolveCurrentDoctorForRequest(req.user);
  const targetDoctorId = doctorId || payload.doctorId;

  if (!Number.isFinite(targetDoctorId)) {
    return res.status(400).json({ message: "doctor_id is required" });
  }

  if (!payload.startAt || !payload.endAt) {
    return res.status(400).json({ message: "start_at and end_at are required" });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const id = await getNextIdWithTableLock(conn, APPOINTMENT_BLOCK_TABLE);
    await conn.execute(
      `INSERT INTO ${APPOINTMENT_BLOCK_TABLE} (
         ID,
         DOCTOR_ID,
         START_AT,
         END_AT,
         REASON,
         CREATED_BY_USER_ID,
         UPDATED_BY_USER_ID
       ) VALUES (
         :id,
         :doctor_id,
         TO_TIMESTAMP(:start_at, 'YYYY-MM-DD HH24:MI'),
         TO_TIMESTAMP(:end_at, 'YYYY-MM-DD HH24:MI'),
         :reason,
         :created_by_user_id,
         :updated_by_user_id
       )`,
      {
        id,
        doctor_id: targetDoctorId,
        start_at: payload.startAt,
        end_at: payload.endAt,
        reason: payload.reason,
        created_by_user_id: req.user?.sub ?? null,
        updated_by_user_id: req.user?.sub ?? null,
      },
      { autoCommit: false }
    );

    await conn.commit();

    const result = await dbQuery(
      `SELECT ID, DOCTOR_ID, START_AT, END_AT, REASON, CREATED_AT, UPDATED_AT
       FROM ${APPOINTMENT_BLOCK_TABLE}
       WHERE ID = :id`,
      { id }
    );

    const row = result.rows[0];
    return res.status(201).json({
      item: {
        id: Number(row.ID),
        doctor_id: Number(row.DOCTOR_ID),
        start_at: row.START_AT,
        end_at: row.END_AT,
        reason: row.REASON,
        created_at: row.CREATED_AT,
        updated_at: row.UPDATED_AT,
      },
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}

export async function updateAppointmentBlock(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  if (!canEditAppointmentBlocks(req.user)) {
    return res.status(403).json({ message: "You are not allowed to manage appointment blocks." });
  }

  const id = normalizeNumber(req.params.id);
  const existingResult = await dbQuery(
    `SELECT ID, DOCTOR_ID FROM ${APPOINTMENT_BLOCK_TABLE} WHERE ID = :id`,
    { id }
  );

  if (existingResult.rows.length === 0) {
    return res.status(404).json({ message: "Not found" });
  }

  const existing = existingResult.rows[0];
  const connectedDoctorId = await resolveCurrentDoctorForRequest(req.user);
  if (connectedDoctorId && Number(existing.DOCTOR_ID) !== connectedDoctorId) {
    return res.status(403).json({ message: "Doctors can edit only their own unavailability blocks." });
  }

  const payload = normalizeBlockPayload(req.body);
  const targetDoctorId = connectedDoctorId || payload.doctorId || Number(existing.DOCTOR_ID);
  if (!Number.isFinite(targetDoctorId)) {
    return res.status(400).json({ message: "doctor_id is required" });
  }
  if (!payload.startAt || !payload.endAt) {
    return res.status(400).json({ message: "start_at and end_at are required" });
  }

  await dbQuery(
    `UPDATE ${APPOINTMENT_BLOCK_TABLE}
     SET DOCTOR_ID = :doctor_id,
         START_AT = TO_TIMESTAMP(:start_at, 'YYYY-MM-DD HH24:MI'),
         END_AT = TO_TIMESTAMP(:end_at, 'YYYY-MM-DD HH24:MI'),
         REASON = :reason,
         UPDATED_AT = SYSTIMESTAMP,
         UPDATED_BY_USER_ID = :updated_by_user_id
     WHERE ID = :id`,
    {
      id,
      doctor_id: targetDoctorId,
      start_at: payload.startAt,
      end_at: payload.endAt,
      reason: payload.reason,
      updated_by_user_id: req.user?.sub ?? null,
    }
  );

  const result = await dbQuery(
    `SELECT ID, DOCTOR_ID, START_AT, END_AT, REASON, CREATED_AT, UPDATED_AT
     FROM ${APPOINTMENT_BLOCK_TABLE}
     WHERE ID = :id`,
    { id }
  );

  const row = result.rows[0];
  return res.json({
    item: {
      id: Number(row.ID),
      doctor_id: Number(row.DOCTOR_ID),
      start_at: row.START_AT,
      end_at: row.END_AT,
      reason: row.REASON,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT,
    },
  });
}

export async function deleteAppointmentBlock(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  if (!canEditAppointmentBlocks(req.user)) {
    return res.status(403).json({ message: "You are not allowed to manage appointment blocks." });
  }

  const id = normalizeNumber(req.params.id);
  const existing = await dbQuery(`SELECT ID FROM ${APPOINTMENT_BLOCK_TABLE} WHERE ID = :id`, { id });
  if (existing.rows.length === 0) return res.status(404).json({ message: "Not found" });

  await dbQuery(`DELETE FROM ${APPOINTMENT_BLOCK_TABLE} WHERE ID = :id`, { id });
  return res.json({ ok: true });
}

export async function listAppointmentRescheduleRequests(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  const connectedDoctorId = await resolveCurrentDoctorForRequest(req.user);
  const clauses = [];
  const binds = {};

  if (req.user?.roles?.includes(ROLE_KEYS.MEDECIN) && connectedDoctorId) {
    clauses.push("r.DOCTOR_ID = :doctor_id");
    binds.doctor_id = connectedDoctorId;
  }

  if (req.query.doctor_id !== undefined && isDoctorOrSecretaryOrAdmin(req.user)) {
    const doctorId = normalizeNumber(req.query.doctor_id);
    if (doctorId !== null) {
      clauses.push("r.DOCTOR_ID = :filter_doctor_id");
      binds.filter_doctor_id = doctorId;
    }
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await dbQuery(
    `SELECT ID, APPOINTMENT_ID, DOCTOR_ID, SUGGESTED_AT, REASON, STATUS, CREATED_AT, DECIDED_AT
     FROM ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE} r
     ${where}
     ORDER BY CREATED_AT DESC, ID DESC`,
    binds
  );

  return res.json({
    items: result.rows.map((row) => ({
      id: Number(row.ID),
      appointment_id: Number(row.APPOINTMENT_ID),
      doctor_id: Number(row.DOCTOR_ID),
      suggested_at: row.SUGGESTED_AT,
      reason: row.REASON,
      status: row.STATUS,
      created_at: row.CREATED_AT,
      decided_at: row.DECIDED_AT,
    })),
  });
}

export async function createAppointmentRescheduleRequest(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  const appointmentId = normalizeNumber(req.params.id);
  const appointmentResult = await dbQuery(
    `SELECT ID, DOCTOR_ID, AGENT_ID, STATUS
     FROM ${APPOINTMENT_TABLE}
     WHERE ID = :id`,
    { id: appointmentId }
  );

  if (appointmentResult.rows.length === 0) {
    return res.status(404).json({ message: "Not found" });
  }

  const appointment = appointmentResult.rows[0];
  const connectedDoctorId = await resolveCurrentDoctorForRequest(req.user);
  const doctorId = connectedDoctorId || Number(appointment.DOCTOR_ID);

  if (req.user?.roles?.includes(ROLE_KEYS.MEDECIN) && Number(appointment.DOCTOR_ID) !== connectedDoctorId) {
    return res.status(403).json({ message: "Doctors can only request reschedules for their own appointments." });
  }

  const suggestedAt = parseIsoTimestamp(req.body.suggested_date, req.body.suggested_time);
  if (!suggestedAt) {
    return res.status(400).json({ message: "suggested_date and suggested_time are required" });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const id = await getNextIdWithTableLock(conn, APPOINTMENT_RESCHEDULE_REQUEST_TABLE);
    await conn.execute(
      `INSERT INTO ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE} (
         ID,
         APPOINTMENT_ID,
         DOCTOR_ID,
         SUGGESTED_AT,
         REASON,
         STATUS,
         CREATED_BY_USER_ID,
         DECIDED_BY_USER_ID
       ) VALUES (
         :id,
         :appointment_id,
         :doctor_id,
         TO_TIMESTAMP(:suggested_at, 'YYYY-MM-DD HH24:MI'),
         :reason,
         'PENDING',
         :created_by_user_id,
         NULL
       )`,
      {
        id,
        appointment_id: appointmentId,
        doctor_id: doctorId,
        suggested_at: suggestedAt,
        reason: req.body.reason ? String(req.body.reason).trim() : null,
        created_by_user_id: req.user?.sub ?? null,
      },
      { autoCommit: false }
    );

    await conn.commit();

    const result = await dbQuery(
      `SELECT ID, APPOINTMENT_ID, DOCTOR_ID, SUGGESTED_AT, REASON, STATUS, CREATED_AT, DECIDED_AT
       FROM ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE}
       WHERE ID = :id`,
      { id }
    );

    const row = result.rows[0];
    return res.status(201).json({
      item: {
        id: Number(row.ID),
        appointment_id: Number(row.APPOINTMENT_ID),
        doctor_id: Number(row.DOCTOR_ID),
        suggested_at: row.SUGGESTED_AT,
        reason: row.REASON,
        status: row.STATUS,
        created_at: row.CREATED_AT,
        decided_at: row.DECIDED_AT,
      },
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}

export async function decideAppointmentRescheduleRequest(req, res) {
  await ensureAppointmentWorkflowInfrastructure();
  const id = normalizeNumber(req.params.id);
  const existing = await dbQuery(
    `SELECT ID FROM ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE} WHERE ID = :id`,
    { id }
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ message: "Not found" });
  }

  const status = String(req.body.status || "").trim().toUpperCase();
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "status must be APPROVED or REJECTED" });
  }

  await dbQuery(
    `UPDATE ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE}
     SET STATUS = :status,
         DECIDED_AT = SYSTIMESTAMP,
         DECIDED_BY_USER_ID = :decided_by_user_id,
         REASON = COALESCE(:reason, REASON)
     WHERE ID = :id`,
    {
      id,
      status,
      reason: req.body.reason ? String(req.body.reason).trim() : null,
      decided_by_user_id: req.user?.sub ?? null,
    }
  );

  const result = await dbQuery(
    `SELECT ID, APPOINTMENT_ID, DOCTOR_ID, SUGGESTED_AT, REASON, STATUS, CREATED_AT, DECIDED_AT
     FROM ${APPOINTMENT_RESCHEDULE_REQUEST_TABLE}
     WHERE ID = :id`,
    { id }
  );

  const row = result.rows[0];
  return res.json({
    item: {
      id: Number(row.ID),
      appointment_id: Number(row.APPOINTMENT_ID),
      doctor_id: Number(row.DOCTOR_ID),
      suggested_at: row.SUGGESTED_AT,
      reason: row.REASON,
      status: row.STATUS,
      created_at: row.CREATED_AT,
      decided_at: row.DECIDED_AT,
    },
  });
}
