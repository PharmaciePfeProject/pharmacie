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

const STOCK_TABLE = withSchema("STOCK");
const STOCKLOT_TABLE = withSchema("STOCKLOT");
const LOT_TABLE = withSchema("LOT");
const PRODUCT_TABLE = withSchema("PRODUCT");
const LOCATION_TABLE = withSchema("LOCATION");

const stockSelect = `
  SELECT
    s.ID AS stock_id,
    s.QUANTITY AS quantity,
    s.LOCKER AS locker,
    s.PRODUIT_ID AS product_id,
    p.LIB AS product_lib,
    p.BAR_CODE AS product_bar_code,
    s.EMPLACEMENT_ID AS emplacement_id,
    l.LIB AS emplacement_label
  FROM ${STOCK_TABLE} s
  LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = s.PRODUIT_ID
  LEFT JOIN ${LOCATION_TABLE} l ON l.ID = s.EMPLACEMENT_ID
`;

const stockLotSelect = `
  SELECT
    sl.ID AS stock_lot_id,
    sl.QUANTITY AS quantity,
    sl.LOT_ID AS lot_id,
    lot.LABEL AS lot_label,
    lot.STATE AS lot_state,
    lot.DATE_REFUSAL AS date_refusal,
    lot.PRODUIT_ID AS product_id,
    p.LIB AS product_lib,
    sl.EMPLACEMENT_ID AS emplacement_id,
    l.LIB AS emplacement_label
  FROM ${STOCKLOT_TABLE} sl
  LEFT JOIN ${LOT_TABLE} lot ON lot.ID = sl.LOT_ID
  LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = lot.PRODUIT_ID
  LEFT JOIN ${LOCATION_TABLE} l ON l.ID = sl.EMPLACEMENT_ID
`;

function buildWhere(filters, allowedFilters) {
  const clauses = [];
  const binds = {};

  for (const field of allowedFilters) {
    if (filters[field] !== undefined) {
      clauses.push(`${field === "lot_id" ? "sl.LOT_ID" : field === "product_id" ? (allowedFilters.includes("lot_id") ? "lot.PRODUIT_ID" : "s.PRODUIT_ID") : "s.EMPLACEMENT_ID"} = :${field}`);
      binds[field] = filters[field];
    }
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

function mapStockRow(row) {
  return {
    stock_id: row.STOCK_ID,
    quantity: row.QUANTITY,
    locker: row.LOCKER,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    product_bar_code: row.PRODUCT_BAR_CODE,
    emplacement_id: row.EMPLACEMENT_ID,
    emplacement_label: row.EMPLACEMENT_LABEL,
  };
}

function mapStockLotRow(row) {
  return {
    stock_lot_id: row.STOCK_LOT_ID,
    quantity: row.QUANTITY,
    lot_id: row.LOT_ID,
    lot_label: row.LOT_LABEL,
    lot_state: row.LOT_STATE,
    date_refusal: row.DATE_REFUSAL,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    emplacement_id: row.EMPLACEMENT_ID,
    emplacement_label: row.EMPLACEMENT_LABEL,
  };
}

export async function listStock(req, res) {
  const { where, binds } = buildWhere(req.query, ["product_id", "emplacement_id"]);
  const result = await runPaginatedQuery({
    baseSql: `${stockSelect}${where}`,
    binds,
    orderBy: "ORDER BY s.ID DESC",
    query: req.query,
  });
  res.json({
    items: result.items.map(mapStockRow),
    pagination: result.pagination,
  });
}

export async function getStockById(req, res) {
  const result = await dbQuery(`${stockSelect} WHERE s.ID = :id`, { id: req.params.id });

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Stock record not found" });
  }

  return res.json({ item: result.rows[0] });
}

export async function listStockLots(req, res) {
  const clauses = [];
  const binds = {};

  if (req.query.product_id !== undefined) {
    clauses.push("lot.PRODUIT_ID = :product_id");
    binds.product_id = req.query.product_id;
  }

  if (req.query.emplacement_id !== undefined) {
    clauses.push("sl.EMPLACEMENT_ID = :emplacement_id");
    binds.emplacement_id = req.query.emplacement_id;
  }

  if (req.query.lot_id !== undefined) {
    clauses.push("sl.LOT_ID = :lot_id");
    binds.lot_id = req.query.lot_id;
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const result = await runPaginatedQuery({
    baseSql: `${stockLotSelect}${where}`,
    binds,
    orderBy: "ORDER BY sl.ID DESC",
    query: req.query,
  });
  res.json({
    items: result.items.map(mapStockLotRow),
    pagination: result.pagination,
  });
}

export async function getStockLotById(req, res) {
  const result = await dbQuery(`${stockLotSelect} WHERE sl.ID = :id`, { id: req.params.id });

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Stock lot record not found" });
  }

  return res.json({ item: result.rows[0] });
}
