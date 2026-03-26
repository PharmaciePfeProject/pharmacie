import { dbQuery } from "../../config/db.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const LOCATION_TABLE = withSchema("LOCATION");
const REFERENCE_TYPE_TABLE = withSchema("REFERENCE_TYPE");
const PHARMA_CLASS_TABLE = withSchema("PHARMA_CLASS");
const TYPE_TABLE = withSchema("TYPE");

async function getNextId(tableName) {
  const result = await dbQuery(`SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${tableName}`);
  return result.rows[0].NEXT_ID;
}

async function assertUniqueLabel(tableName, columnName, value, fieldName) {
  const result = await dbQuery(
    `SELECT ID FROM ${tableName} WHERE UPPER(${columnName}) = UPPER(:value)`,
    { value }
  );

  if (result.rows.length > 0) {
    const error = new Error(`${fieldName} already exists`);
    error.status = 409;
    error.details = { [fieldName]: "Duplicate value" };
    throw error;
  }
}

export async function listLocations(req, res) {
  const result = await dbQuery(
    `SELECT ID AS location_id, LIB AS lib FROM ${LOCATION_TABLE} ORDER BY ID`
  );
  res.json({ items: result.rows });
}

export async function createLocation(req, res) {
  await assertUniqueLabel(LOCATION_TABLE, "LIB", req.body.lib, "lib");
  const locationId = await getNextId(LOCATION_TABLE);

  await dbQuery(
    `INSERT INTO ${LOCATION_TABLE} (ID, LIB) VALUES (:id, :lib)`,
    { id: locationId, lib: req.body.lib }
  );

  res.status(201).json({
    item: {
      location_id: locationId,
      lib: req.body.lib,
    },
  });
}

export async function listMovementTypes(req, res) {
  const result = await dbQuery(
    `SELECT ID AS movement_type_id, LABEL AS label FROM ${REFERENCE_TYPE_TABLE} ORDER BY ID`
  );
  res.json({ items: result.rows });
}

export async function createMovementType(req, res) {
  await assertUniqueLabel(REFERENCE_TYPE_TABLE, "LABEL", req.body.label, "label");
  const movementTypeId = await getNextId(REFERENCE_TYPE_TABLE);

  await dbQuery(
    `INSERT INTO ${REFERENCE_TYPE_TABLE} (ID, LABEL) VALUES (:id, :label)`,
    { id: movementTypeId, label: req.body.label }
  );

  res.status(201).json({
    item: {
      movement_type_id: movementTypeId,
      label: req.body.label,
    },
  });
}

export async function listPharmaClasses(req, res) {
  const result = await dbQuery(
    `SELECT ID AS pharma_class_id, LABEL AS label FROM ${PHARMA_CLASS_TABLE} ORDER BY ID`
  );
  res.json({ items: result.rows });
}

export async function listProductTypes(req, res) {
  const result = await dbQuery(
    `SELECT ID AS product_type_id, LABEL AS label FROM ${TYPE_TABLE} ORDER BY ID`
  );
  res.json({ items: result.rows });
}
