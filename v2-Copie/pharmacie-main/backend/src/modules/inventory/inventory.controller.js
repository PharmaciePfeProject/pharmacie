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

const INVENTORY_TABLE = withSchema("INVENTORY");
const INVENTORY_LINE_TABLE = withSchema("INVENTORY_LINE");
const PRODUCT_TABLE = withSchema("PRODUCT");
const LOT_TABLE = withSchema("LOT");
const LOCATION_TABLE = withSchema("LOCATION");
const USER_TABLE = withSchema("UTILISATEUR");
const STATE_TABLE = withSchema("STATE");

const inventoryHeaderSelect = `
  SELECT
    i.ID AS inventory_id,
    i.DATE_INV AS date_inv,
    i.LOCATION_ID AS location_id,
    loc.LIB AS location_label,
    i.STATE_ID AS state_id,
    st.TYPE AS state_label,
    i.UTILISTAURE_ID AS user_id,
    u.USERNAME AS username
  FROM ${INVENTORY_TABLE} i
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = i.LOCATION_ID
  LEFT JOIN ${STATE_TABLE} st ON st.ID = i.STATE_ID
  LEFT JOIN ${USER_TABLE} u ON u.ID = i.UTILISTAURE_ID
`;

function buildInventoryFilters(query) {
  const clauses = [];
  const binds = {};

  if (query.product_id !== undefined) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM ${INVENTORY_LINE_TABLE} il
        WHERE il.INVENTORY_ID = i.ID
          AND il.PRODUCT_ID = :product_id
      )`
    );
    binds.product_id = query.product_id;
  }

  if (query.location_id !== undefined) {
    clauses.push("i.LOCATION_ID = :location_id");
    binds.location_id = query.location_id;
  }

  if (query.state_id !== undefined) {
    clauses.push("i.STATE_ID = :state_id");
    binds.state_id = query.state_id;
  }

  if (query.user_id !== undefined) {
    clauses.push("i.UTILISTAURE_ID = :user_id");
    binds.user_id = query.user_id;
  }

  if (query.date_from !== undefined) {
    clauses.push("i.DATE_INV >= TO_DATE(:date_from, 'YYYY-MM-DD')");
    binds.date_from = query.date_from;
  }

  if (query.date_to !== undefined) {
    clauses.push("i.DATE_INV < TO_DATE(:date_to, 'YYYY-MM-DD') + 1");
    binds.date_to = query.date_to;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getInventoryLines(inventoryIds) {
  if (inventoryIds.length === 0) return [];

  const rows = [];

  for (const inventoryIdChunk of chunkValues(inventoryIds)) {
    const bindNames = inventoryIdChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(inventoryIdChunk.map((id, index) => [`id${index}`, id]));

    const result = await dbQuery(
      `
        SELECT
          il.ID AS line_id,
          il.INVENTORY_ID AS inventory_id,
          il.PRODUCT_ID AS product_id,
          p.LIB AS product_lib,
          il.LOT_ID AS lot_id,
          lot.LABEL AS lot_label,
          il.INVENT_QTE AS invent_qte,
          il.STOCK_QTE AS stock_qte,
          il.STOCK_QTE_LOT AS stock_qte_lot,
          il.DISCARD AS discard,
          il.PRICE AS price,
          il.VAT_RATE AS vat_rate
        FROM ${INVENTORY_LINE_TABLE} il
        LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = il.PRODUCT_ID
        LEFT JOIN ${LOT_TABLE} lot ON lot.ID = il.LOT_ID
        WHERE il.INVENTORY_ID IN (${bindNames.map((name) => `:${name}`).join(", ")})
        ORDER BY il.INVENTORY_ID DESC, il.ID ASC
      `,
      binds
    );

    rows.push(...result.rows);
  }

  return rows;
}

function attachLines(headers, lines) {
  const linesByInventoryId = new Map();

  for (const line of lines) {
    const inventoryId = line.INVENTORY_ID;
    if (!linesByInventoryId.has(inventoryId)) {
      linesByInventoryId.set(inventoryId, []);
    }

    linesByInventoryId.get(inventoryId).push({
      line_id: line.LINE_ID,
      product_id: line.PRODUCT_ID,
      product_lib: line.PRODUCT_LIB,
      lot_id: line.LOT_ID,
      lot_label: line.LOT_LABEL,
      invent_qte: line.INVENT_QTE,
      stock_qte: line.STOCK_QTE,
      stock_qte_lot: line.STOCK_QTE_LOT,
      discard: line.DISCARD,
      price: line.PRICE,
      vat_rate: line.VAT_RATE,
    });
  }

  return headers.map((header) => ({
    inventory_id: header.INVENTORY_ID,
    date_inv: header.DATE_INV,
    location_id: header.LOCATION_ID,
    location_label: header.LOCATION_LABEL,
    state_id: header.STATE_ID,
    state_label: header.STATE_LABEL,
    user_id: header.USER_ID,
    username: header.USERNAME,
    lines: linesByInventoryId.get(header.INVENTORY_ID) || [],
  }));
}

export async function listInventories(req, res) {
  const { where, binds } = buildInventoryFilters(req.query);
  const result = await runPaginatedQuery({
    baseSql: `${inventoryHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY i.DATE_INV DESC, i.ID DESC",
    query: req.query,
  });
  const headers = result.items;
  const lines = await getInventoryLines(headers.map((header) => header.INVENTORY_ID));
  res.json({ items: attachLines(headers, lines), pagination: result.pagination });
}

export async function getInventoryById(req, res) {
  const headerResult = await dbQuery(`${inventoryHeaderSelect} WHERE i.ID = :id`, {
    id: req.params.id,
  });

  if (headerResult.rows.length === 0) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  const lines = await getInventoryLines([req.params.id]);
  const [item] = attachLines(headerResult.rows, lines);
  return res.json({ item });
}
