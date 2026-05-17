import { dbQuery } from "../../config/db.js";
import { chunkValues } from "../../utils/oracle.js";
import { runPaginatedQuery } from "../../utils/pagination.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const STOCK_MOVEMENT_TABLE = withSchema("STOCK_MOVEMENT");
const STOCK_MOVEMENT_LINE_TABLE = withSchema("STOCK_MOVEMENT_LINE");
const PRODUCT_TABLE = withSchema("PRODUCT");
const LOT_TABLE = withSchema("LOT");
const LOCATION_TABLE = withSchema("LOCATION");
const REFERENCE_TYPE_TABLE = withSchema("REFERENCE_TYPE");
const USER_TABLE = withSchema("UTILISATEUR");

const movementHeaderSelect = `
  SELECT
    sm.ID AS movement_id,
    sm.NUM_MOVEMENT AS num_movement,
    sm.DATE_MOVEMENT AS date_movement,
    sm.TYPE_MVT AS type_mvt,
    sm.DESCRIMINATOR AS descriminator,
    sm.REFERENCE_TYPE_ID AS reference_type_id,
    rt.LABEL AS reference_type_label,
    sm.LOCATION_ID AS location_id,
    loc.LIB AS location_label,
    sm.UTILISTAURE_ID AS user_id,
    u.USERNAME AS username,
    sm.DAY_ID AS day_id,
    sm.DISTRIBUTION_ID AS distribution_id,
    sm.INTERNAL_DELIVERY_ID AS internal_delivery_id,
    sm.RECEPTION_ID AS reception_id
  FROM ${STOCK_MOVEMENT_TABLE} sm
  LEFT JOIN ${REFERENCE_TYPE_TABLE} rt ON rt.ID = sm.REFERENCE_TYPE_ID
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = sm.LOCATION_ID
  LEFT JOIN ${USER_TABLE} u ON u.ID = sm.UTILISTAURE_ID
`;

function buildMovementFilters(query) {
  const clauses = [];
  const binds = {};

  if (query.product_id !== undefined) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM ${STOCK_MOVEMENT_LINE_TABLE} sml
        WHERE sml.STOCK_MOVEMENT_ID = sm.ID
          AND sml.PRODUCT_ID = :product_id
      )`
    );
    binds.product_id = query.product_id;
  }

  if (query.emplacement_id !== undefined) {
    clauses.push("sm.LOCATION_ID = :emplacement_id");
    binds.emplacement_id = query.emplacement_id;
  }

  if (query.reference_type_id !== undefined) {
    clauses.push("sm.REFERENCE_TYPE_ID = :reference_type_id");
    binds.reference_type_id = query.reference_type_id;
  }

  if (query.date_from !== undefined) {
    clauses.push("sm.DATE_MOVEMENT >= TO_DATE(:date_from, 'YYYY-MM-DD')");
    binds.date_from = query.date_from;
  }

  if (query.date_to !== undefined) {
    clauses.push("sm.DATE_MOVEMENT < TO_DATE(:date_to, 'YYYY-MM-DD') + 1");
    binds.date_to = query.date_to;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getMovementLines(movementIds) {
  if (movementIds.length === 0) return [];

  const rows = [];

  for (const movementIdChunk of chunkValues(movementIds)) {
    const bindNames = movementIdChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(movementIdChunk.map((id, index) => [`id${index}`, id]));

    const result = await dbQuery(
      `
        SELECT
          sml.ID AS line_id,
          sml.STOCK_MOVEMENT_ID AS stock_movement_id,
          sml.PRODUCT_ID AS product_id,
          p.LIB AS product_lib,
          sml.LOT_ID AS lot_id,
          lot.LABEL AS lot_label,
          sml.MOVMENT_QTE AS movement_qte,
          sml.MOTIF_ID AS motif_id
        FROM ${STOCK_MOVEMENT_LINE_TABLE} sml
        LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = sml.PRODUCT_ID
        LEFT JOIN ${LOT_TABLE} lot ON lot.ID = sml.LOT_ID
        WHERE sml.STOCK_MOVEMENT_ID IN (${bindNames.map((name) => `:${name}`).join(", ")})
        ORDER BY sml.STOCK_MOVEMENT_ID DESC, sml.ID ASC
      `,
      binds
    );

    rows.push(...result.rows);
  }

  return rows;
}

function attachLines(headers, lines) {
  const linesByMovementId = new Map();

  for (const line of lines) {
    const movementId = line.STOCK_MOVEMENT_ID;
    if (!linesByMovementId.has(movementId)) {
      linesByMovementId.set(movementId, []);
    }

    linesByMovementId.get(movementId).push({
      line_id: line.LINE_ID,
      product_id: line.PRODUCT_ID,
      product_lib: line.PRODUCT_LIB,
      lot_id: line.LOT_ID,
      lot_label: line.LOT_LABEL,
      movement_qte: line.MOVEMENT_QTE,
      motif_id: line.MOTIF_ID,
    });
  }

  return headers.map((header) => ({
    movement_id: header.MOVEMENT_ID,
    num_movement: header.NUM_MOVEMENT,
    date_movement: header.DATE_MOVEMENT,
    type_mvt: header.TYPE_MVT,
    descriminator: header.DESCRIMINATOR,
    reference_type_id: header.REFERENCE_TYPE_ID,
    reference_type_label: header.REFERENCE_TYPE_LABEL,
    location_id: header.LOCATION_ID,
    location_label: header.LOCATION_LABEL,
    user_id: header.USER_ID,
    username: header.USERNAME,
    day_id: header.DAY_ID,
    distribution_id: header.DISTRIBUTION_ID,
    internal_delivery_id: header.INTERNAL_DELIVERY_ID,
    reception_id: header.RECEPTION_ID,
    lines: linesByMovementId.get(header.MOVEMENT_ID) || [],
  }));
}

export async function listStockMovements(req, res) {
  const { where, binds } = buildMovementFilters(req.query);
  const result = await runPaginatedQuery({
    baseSql: `${movementHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY sm.DATE_MOVEMENT DESC, sm.ID DESC",
    query: req.query,
  });
  const headers = result.items;
  const lines = await getMovementLines(headers.map((header) => header.MOVEMENT_ID));
  res.json({ items: attachLines(headers, lines), pagination: result.pagination });
}

export async function getStockMovementById(req, res) {
  const headerResult = await dbQuery(`${movementHeaderSelect} WHERE sm.ID = :id`, {
    id: req.params.id,
  });

  if (headerResult.rows.length === 0) {
    return res.status(404).json({ message: "Stock movement not found" });
  }

  const lines = await getMovementLines([req.params.id]);
  const [item] = attachLines(headerResult.rows, lines);
  return res.json({ item });
}
