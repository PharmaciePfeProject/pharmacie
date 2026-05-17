import { dbQuery, initDb } from "../../config/db.js";
import { runPaginatedQuery } from "../../utils/pagination.js";
import { DOCTOR_TABLE, getDoctorActivedExpression, hasDoctorActivedColumn } from "../../utils/doctorProfiles.js";
import { getNextIdWithTableLock } from "../../utils/oracleIds.js";

async function getDoctorSelect() {
  const activedExpression = await getDoctorActivedExpression("d");

  return `
    SELECT
      d.ID AS doctor_id,
      d.NAME AS name,
      d.SPECIALTY AS specialty,
      d.ADDRESS AS address,
      d.TEL AS tel,
      ${activedExpression} AS actived
    FROM ${DOCTOR_TABLE} d
  `;
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

export async function listDoctors(req, res) {
  const doctorSelect = await getDoctorSelect();
  const hasActived = await hasDoctorActivedColumn();
  const { where, binds } = buildDoctorFilters(req.query);

  const normalizedWhere =
    hasActived || !where
      ? where
      : where.replaceAll("NVL(d.ACTIVED, 1)", "1");

  const result = await runPaginatedQuery({
    baseSql: `${doctorSelect}${normalizedWhere}`,
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
  const hasActived = await hasDoctorActivedColumn();
  const pool = await initDb();
  const conn = await pool.getConnection();
  let doctorId;

  try {
    doctorId = await getNextIdWithTableLock(conn, DOCTOR_TABLE);

    if (hasActived) {
      await conn.execute(
        `INSERT INTO ${DOCTOR_TABLE} (ID, NAME, SPECIALTY, ADDRESS, TEL, ACTIVED)
         VALUES (:id, :name, :specialty, :address, :tel, 1)`,
        {
          id: doctorId,
          name: req.body.name,
          specialty: req.body.specialty || null,
          address: req.body.address || null,
          tel: req.body.tel ?? null,
        },
        { autoCommit: false }
      );
    } else {
      await conn.execute(
        `INSERT INTO ${DOCTOR_TABLE} (ID, NAME, SPECIALTY, ADDRESS, TEL)
         VALUES (:id, :name, :specialty, :address, :tel)`,
        {
          id: doctorId,
          name: req.body.name,
          specialty: req.body.specialty || null,
          address: req.body.address || null,
          tel: req.body.tel ?? null,
        },
        { autoCommit: false }
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const doctorSelect = await getDoctorSelect();
  const result = await dbQuery(`${doctorSelect} WHERE d.ID = :id`, { id: doctorId });
  return res.status(201).json({ item: mapDoctor(result.rows[0]) });
}

export async function updateDoctorRecord(req, res) {
  const existing = await dbQuery(`SELECT ID FROM ${DOCTOR_TABLE} WHERE ID = :id`, { id: req.params.id });
  if (existing.rows.length === 0) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  if (await hasDoctorActivedColumn()) {
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
  } else {
    await dbQuery(
      `UPDATE ${DOCTOR_TABLE}
       SET NAME = :name,
           SPECIALTY = :specialty,
           ADDRESS = :address,
           TEL = :tel
       WHERE ID = :id`,
      {
        id: req.params.id,
        name: req.body.name,
        specialty: req.body.specialty || null,
        address: req.body.address || null,
        tel: req.body.tel ?? null,
      }
    );
  }

  const doctorSelect = await getDoctorSelect();
  const result = await dbQuery(`${doctorSelect} WHERE d.ID = :id`, { id: req.params.id });
  return res.json({ item: mapDoctor(result.rows[0]) });
}

export async function toggleDoctorActive(req, res) {
  if (!(await hasDoctorActivedColumn())) {
    return res.status(409).json({ message: "Doctor activation is not available in this schema." });
  }

  const doctorSelect = await getDoctorSelect();
  const existing = await dbQuery(`${doctorSelect} WHERE d.ID = :id`, { id: req.params.id });
  if (existing.rows.length === 0) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  const current = Number(existing.rows[0].ACTIVED ?? 1);
  const next = current === 1 ? 0 : 1;

  await dbQuery(`UPDATE ${DOCTOR_TABLE} SET ACTIVED = :actived WHERE ID = :id`, {
    id: req.params.id,
    actived: next,
  });

  const result = await dbQuery(`${doctorSelect} WHERE d.ID = :id`, { id: req.params.id });
  return res.json({ item: mapDoctor(result.rows[0]) });
}
