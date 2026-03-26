import { dbQuery } from "../../config/db.js";
import { runPaginatedQuery } from "../../utils/pagination.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const DOCTOR_TABLE = withSchema("DOCTOR");
const DOCTOR_SELECT = `
  SELECT
    d.ID AS doctor_id,
    d.NAME AS name,
    d.SPECIALTY AS specialty,
    d.ADDRESS AS address,
    d.TEL AS tel,
    NVL(d.ACTIVED, 1) AS actived
  FROM ${DOCTOR_TABLE} d
`;

let activedColumnChecked = false;

async function ensureActivedColumn() {
  if (activedColumnChecked) return;

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

  activedColumnChecked = true;
}

function mapDoctor(row) {
  return {
    doctor_id: row.DOCTOR_ID,
    name: row.NAME,
    specialty: row.SPECIALTY,
    address: row.ADDRESS,
    tel: row.TEL,
    actived: row.ACTIVED,
  };
}

function buildDoctorFilters(query) {
  const clauses = [];
  const binds = {};

  if (query.search) {
    clauses.push(
      `(UPPER(d.NAME) LIKE UPPER(:search) OR UPPER(NVL(d.SPECIALTY, '')) LIKE UPPER(:search) OR UPPER(NVL(d.ADDRESS, '')) LIKE UPPER(:search) OR TO_CHAR(NVL(d.TEL, 0)) LIKE :search_tel)`
    );
    binds.search = `%${query.search}%`;
    binds.search_tel = `%${query.search}%`;
  }

  if (query.specialty) {
    clauses.push("UPPER(NVL(d.SPECIALTY, '')) LIKE UPPER(:specialty)");
    binds.specialty = `%${query.specialty}%`;
  }

  if (query.actived !== undefined) {
    clauses.push("NVL(d.ACTIVED, 1) = :actived");
    binds.actived = query.actived;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getNextDoctorId() {
  const result = await dbQuery(`SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${DOCTOR_TABLE}`);
  return result.rows[0].NEXT_ID;
}

export async function listDoctors(req, res) {
  await ensureActivedColumn();

  const { where, binds } = buildDoctorFilters(req.query);
  const result = await runPaginatedQuery({
    baseSql: `${DOCTOR_SELECT}${where}`,
    binds,
    orderBy: "ORDER BY d.ID DESC",
    query: req.query,
  });

  return res.json({
    items: result.items.map(mapDoctor),
    pagination: result.pagination,
  });
}

export async function createDoctorRecord(req, res) {
  await ensureActivedColumn();

  const doctorId = await getNextDoctorId();

  await dbQuery(
    `INSERT INTO ${DOCTOR_TABLE} (ID, NAME, SPECIALTY, ADDRESS, TEL, ACTIVED)
     VALUES (:id, :name, :specialty, :address, :tel, 1)`,
    {
      id: doctorId,
      name: req.body.name,
      specialty: req.body.specialty || null,
      address: req.body.address || null,
      tel: req.body.tel ?? null,
    }
  );

  const result = await dbQuery(`${DOCTOR_SELECT} WHERE d.ID = :id`, { id: doctorId });
  return res.status(201).json({ item: mapDoctor(result.rows[0]) });
}

export async function updateDoctorRecord(req, res) {
  await ensureActivedColumn();

  const existing = await dbQuery(`SELECT ID FROM ${DOCTOR_TABLE} WHERE ID = :id`, { id: req.params.id });
  if (existing.rows.length === 0) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  await dbQuery(
    `UPDATE ${DOCTOR_TABLE}
     SET NAME = :name,
         SPECIALTY = :specialty,
         ADDRESS = :address,
         TEL = :tel,
         ACTIVED = NVL(:actived, NVL(ACTIVED, 1))
     WHERE ID = :id`,
    {
      id: req.params.id,
      name: req.body.name,
      specialty: req.body.specialty || null,
      address: req.body.address || null,
      tel: req.body.tel ?? null,
      actived: req.body.actived,
    }
  );

  const result = await dbQuery(`${DOCTOR_SELECT} WHERE d.ID = :id`, { id: req.params.id });
  return res.json({ item: mapDoctor(result.rows[0]) });
}

export async function toggleDoctorActive(req, res) {
  await ensureActivedColumn();

  const existing = await dbQuery(`${DOCTOR_SELECT} WHERE d.ID = :id`, { id: req.params.id });
  if (existing.rows.length === 0) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  const current = Number(existing.rows[0].ACTIVED ?? 1);
  const next = current === 1 ? 0 : 1;

  await dbQuery(`UPDATE ${DOCTOR_TABLE} SET ACTIVED = :actived WHERE ID = :id`, {
    id: req.params.id,
    actived: next,
  });

  const result = await dbQuery(`${DOCTOR_SELECT} WHERE d.ID = :id`, { id: req.params.id });
  return res.json({ item: mapDoctor(result.rows[0]) });
}
