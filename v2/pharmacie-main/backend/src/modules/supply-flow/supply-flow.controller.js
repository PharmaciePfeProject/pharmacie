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

const EXTERNAL_ORDER_TABLE = withSchema("EXTERNAL_ORDER");
const EXTERNAL_ORDER_LINE_TABLE = withSchema("EXTERNAL_ORDER_LINE");
const INTERNAL_ORDER_TABLE = withSchema("INTERNAL_ORDER");
const INTERNAL_ORDER_LINE_TABLE = withSchema("INTERNAL_ORDER_LINE");
const RECEPTION_TABLE = withSchema("RECEPTION");
const RECEPTION_LINE_TABLE = withSchema("RECEPTION_LINE");
const INTERNAL_DELIVERY_TABLE = withSchema("INTERNAL_DELIVERY");
const INTERNAL_DELIVERY_LINE_TABLE = withSchema("INTERNAL_DELIVERY_LINE");
const PRODUCT_TABLE = withSchema("PRODUCT");
const LOT_TABLE = withSchema("LOT");
const LOCATION_TABLE = withSchema("LOCATION");
const USER_TABLE = withSchema("UTILISATEUR");
const STATE_TABLE = withSchema("STATE");
const TYPE_TABLE = withSchema("TYPE");
const CUSTOMER_TABLE = withSchema("CUSTOMER");

const externalOrderHeaderSelect = `
  SELECT
    eo.ID AS external_order_id,
    eo.NUM_EXTERNAL_ORDER AS order_number,
    eo.DATE_EXTER_ORDER AS order_date,
    eo.DAY_ID AS day_id,
    eo.EMPLACEMENT_ID AS emplacement_id,
    loc.LIB AS emplacement_label,
    eo.STATE_ID AS state_id,
    st.TYPE AS state_label
  FROM ${EXTERNAL_ORDER_TABLE} eo
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = eo.EMPLACEMENT_ID
  LEFT JOIN ${STATE_TABLE} st ON st.ID = eo.STATE_ID
`;

const internalOrderHeaderSelect = `
  SELECT
    io.ID AS internal_order_id,
    io.NUM_ORDER AS order_number,
    io.DATE_ORDER AS order_date,
    io.DAY_ID AS day_id,
    io.EMPLACEMENT_ID AS emplacement_id,
    loc.LIB AS emplacement_label,
    io.STATE_ID AS state_id,
    st.TYPE AS state_label,
    io.TYPE_ID AS type_id,
    tp.LABEL AS type_label
  FROM ${INTERNAL_ORDER_TABLE} io
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = io.EMPLACEMENT_ID
  LEFT JOIN ${STATE_TABLE} st ON st.ID = io.STATE_ID
  LEFT JOIN ${TYPE_TABLE} tp ON tp.ID = io.TYPE_ID
`;

const receptionHeaderSelect = `
  SELECT
    r.ID AS reception_id,
    r.NUM_RECEPTION AS reception_number,
    r.DATE_RECEPTION AS date_reception,
    r.DATE_LIV AS date_liv,
    r.DATE_INVOICE AS date_invoice,
    r.NUM_EXTERNAL_DELIVERY AS num_external_delivery,
    r.NUM_INVOICE AS num_invoice,
    r.DAY_ID AS day_id,
    r.EXTERNAL_ORDER_ID AS external_order_id,
    eo.NUM_EXTERNAL_ORDER AS external_order_number,
    r.EMPLACEMENT_ID AS emplacement_id,
    loc.LIB AS emplacement_label,
    r.STATE_ID AS state_id,
    st.TYPE AS state_label,
    r.UTILISTAURE_ID AS user_id,
    u.USERNAME AS username,
    r.TYPE_ID AS type_id,
    tp.LABEL AS type_label
  FROM ${RECEPTION_TABLE} r
  LEFT JOIN ${EXTERNAL_ORDER_TABLE} eo ON eo.ID = r.EXTERNAL_ORDER_ID
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = r.EMPLACEMENT_ID
  LEFT JOIN ${STATE_TABLE} st ON st.ID = r.STATE_ID
  LEFT JOIN ${USER_TABLE} u ON u.ID = r.UTILISTAURE_ID
  LEFT JOIN ${TYPE_TABLE} tp ON tp.ID = r.TYPE_ID
`;

const internalDeliveryHeaderSelect = `
  SELECT
    idl.ID AS internal_delivery_id,
    idl.NUM_DELIVERY AS delivery_number,
    idl.DATE_DELIVERY AS date_delivery,
    idl.CUSTOMER_ID AS customer_id,
    c.LABEL AS customer_label,
    idl.DAY_ID AS day_id,
    idl.INTERNAL_ORDER_ID AS internal_order_id,
    io.NUM_ORDER AS internal_order_number,
    idl.LOCATION_ID AS location_id,
    loc.LIB AS location_label,
    idl.STATE_ID AS state_id,
    st.TYPE AS state_label,
    idl.UTILISTAURE_ID AS user_id,
    u.USERNAME AS username
  FROM ${INTERNAL_DELIVERY_TABLE} idl
  LEFT JOIN ${CUSTOMER_TABLE} c ON c.ID = idl.CUSTOMER_ID
  LEFT JOIN ${INTERNAL_ORDER_TABLE} io ON io.ID = idl.INTERNAL_ORDER_ID
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = idl.LOCATION_ID
  LEFT JOIN ${STATE_TABLE} st ON st.ID = idl.STATE_ID
  LEFT JOIN ${USER_TABLE} u ON u.ID = idl.UTILISTAURE_ID
`;

function buildFilterClauses(query, config) {
  const clauses = [];
  const binds = {};

  for (const item of config.scalarFilters) {
    if (query[item.queryKey] !== undefined) {
      clauses.push(`${item.column} = :${item.queryKey}`);
      binds[item.queryKey] = query[item.queryKey];
    }
  }

  if (config.productFilter && query.product_id !== undefined) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM ${config.productFilter.lineTable} lines
        WHERE lines.${config.productFilter.headerFk} = ${config.alias}.ID
          AND lines.PRODUCT_ID = :product_id
      )`
    );
    binds.product_id = query.product_id;
  }

  if (query.date_from !== undefined) {
    clauses.push(`${config.dateColumn} >= TO_DATE(:date_from, 'YYYY-MM-DD')`);
    binds.date_from = query.date_from;
  }

  if (query.date_to !== undefined) {
    clauses.push(`${config.dateColumn} < TO_DATE(:date_to, 'YYYY-MM-DD') + 1`);
    binds.date_to = query.date_to;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getLinesByHeaderIds({ lineTable, productJoin = true, lotJoin = false, extraColumns, headerFk, orderBy }, ids) {
  if (ids.length === 0) return [];

  const joins = [];
  if (productJoin) joins.push(`LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = lines.PRODUCT_ID`);
  if (lotJoin) joins.push(`LEFT JOIN ${LOT_TABLE} lot ON lot.ID = lines.LOT_ID`);

  const rows = [];

  for (const idChunk of chunkValues(ids)) {
    const bindNames = idChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(idChunk.map((id, index) => [`id${index}`, id]));

    const result = await dbQuery(
      `
        SELECT
          lines.ID AS line_id,
          lines.${headerFk} AS header_id,
          ${extraColumns.join(",\n        ")}
        FROM ${lineTable} lines
        ${joins.join("\n        ")}
        WHERE lines.${headerFk} IN (${bindNames.map((name) => `:${name}`).join(", ")})
        ORDER BY lines.${headerFk} DESC, ${orderBy}
      `,
      binds
    );

    rows.push(...result.rows);
  }

  return rows;
}

function groupLines(rows, mapLine) {
  const grouped = new Map();
  for (const row of rows) {
    const headerId = row.HEADER_ID;
    if (!grouped.has(headerId)) grouped.set(headerId, []);
    grouped.get(headerId).push(mapLine(row));
  }
  return grouped;
}

export async function listExternalOrders(req, res) {
  const { where, binds } = buildFilterClauses(req.query, {
    alias: "eo",
    dateColumn: "eo.DATE_EXTER_ORDER",
    scalarFilters: [
      { queryKey: "emplacement_id", column: "eo.EMPLACEMENT_ID" },
      { queryKey: "state_id", column: "eo.STATE_ID" },
    ],
    productFilter: { lineTable: EXTERNAL_ORDER_LINE_TABLE, headerFk: "EXTERNAL_ORDER_ID" },
  });
  const result = await runPaginatedQuery({
    baseSql: `${externalOrderHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY eo.DATE_EXTER_ORDER DESC, eo.ID DESC",
    query: req.query,
  });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: EXTERNAL_ORDER_LINE_TABLE,
      headerFk: "EXTERNAL_ORDER_ID",
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.ORDER_QTE AS order_qte",
        "lines.PRICE AS price",
        "lines.VAT_RATE AS vat_rate",
      ],
      orderBy: "lines.ID ASC",
    },
    result.items.map((row) => row.EXTERNAL_ORDER_ID)
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    order_qte: row.ORDER_QTE,
    price: row.PRICE,
    vat_rate: row.VAT_RATE,
  }));
  res.json({
    items: result.items.map((row) => ({
      external_order_id: row.EXTERNAL_ORDER_ID,
      order_number: row.ORDER_NUMBER,
      order_date: row.ORDER_DATE,
      day_id: row.DAY_ID,
      emplacement_id: row.EMPLACEMENT_ID,
      emplacement_label: row.EMPLACEMENT_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      lines: grouped.get(row.EXTERNAL_ORDER_ID) || [],
    })),
    pagination: result.pagination,
  });
}

export async function getExternalOrderById(req, res) {
  const headerResult = await dbQuery(`${externalOrderHeaderSelect} WHERE eo.ID = :id`, { id: req.params.id });
  if (headerResult.rows.length === 0) return res.status(404).json({ message: "External order not found" });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: EXTERNAL_ORDER_LINE_TABLE,
      headerFk: "EXTERNAL_ORDER_ID",
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.ORDER_QTE AS order_qte",
        "lines.PRICE AS price",
        "lines.VAT_RATE AS vat_rate",
      ],
      orderBy: "lines.ID ASC",
    },
    [req.params.id]
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    order_qte: row.ORDER_QTE,
    price: row.PRICE,
    vat_rate: row.VAT_RATE,
  }));
  const row = headerResult.rows[0];
  res.json({
    item: {
      external_order_id: row.EXTERNAL_ORDER_ID,
      order_number: row.ORDER_NUMBER,
      order_date: row.ORDER_DATE,
      day_id: row.DAY_ID,
      emplacement_id: row.EMPLACEMENT_ID,
      emplacement_label: row.EMPLACEMENT_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      lines: grouped.get(row.EXTERNAL_ORDER_ID) || [],
    },
  });
}

export async function listInternalOrders(req, res) {
  const { where, binds } = buildFilterClauses(req.query, {
    alias: "io",
    dateColumn: "io.DATE_ORDER",
    scalarFilters: [
      { queryKey: "emplacement_id", column: "io.EMPLACEMENT_ID" },
      { queryKey: "state_id", column: "io.STATE_ID" },
      { queryKey: "type_id", column: "io.TYPE_ID" },
    ],
    productFilter: { lineTable: INTERNAL_ORDER_LINE_TABLE, headerFk: "INTERNAL_ORDER_ID" },
  });
  const result = await runPaginatedQuery({
    baseSql: `${internalOrderHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY io.DATE_ORDER DESC, io.ID DESC",
    query: req.query,
  });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: INTERNAL_ORDER_LINE_TABLE,
      headerFk: "INTERNAL_ORDER_ID",
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.ORDER_QTE AS order_qte",
      ],
      orderBy: "lines.ID ASC",
    },
    result.items.map((row) => row.INTERNAL_ORDER_ID)
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    order_qte: row.ORDER_QTE,
  }));
  res.json({
    items: result.items.map((row) => ({
      internal_order_id: row.INTERNAL_ORDER_ID,
      order_number: row.ORDER_NUMBER,
      order_date: row.ORDER_DATE,
      day_id: row.DAY_ID,
      emplacement_id: row.EMPLACEMENT_ID,
      emplacement_label: row.EMPLACEMENT_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      type_id: row.TYPE_ID,
      type_label: row.TYPE_LABEL,
      lines: grouped.get(row.INTERNAL_ORDER_ID) || [],
    })),
    pagination: result.pagination,
  });
}

export async function getInternalOrderById(req, res) {
  const headerResult = await dbQuery(`${internalOrderHeaderSelect} WHERE io.ID = :id`, { id: req.params.id });
  if (headerResult.rows.length === 0) return res.status(404).json({ message: "Internal order not found" });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: INTERNAL_ORDER_LINE_TABLE,
      headerFk: "INTERNAL_ORDER_ID",
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.ORDER_QTE AS order_qte",
      ],
      orderBy: "lines.ID ASC",
    },
    [req.params.id]
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    order_qte: row.ORDER_QTE,
  }));
  const row = headerResult.rows[0];
  res.json({
    item: {
      internal_order_id: row.INTERNAL_ORDER_ID,
      order_number: row.ORDER_NUMBER,
      order_date: row.ORDER_DATE,
      day_id: row.DAY_ID,
      emplacement_id: row.EMPLACEMENT_ID,
      emplacement_label: row.EMPLACEMENT_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      type_id: row.TYPE_ID,
      type_label: row.TYPE_LABEL,
      lines: grouped.get(row.INTERNAL_ORDER_ID) || [],
    },
  });
}

export async function listReceptions(req, res) {
  const { where, binds } = buildFilterClauses(req.query, {
    alias: "r",
    dateColumn: "r.DATE_RECEPTION",
    scalarFilters: [
      { queryKey: "emplacement_id", column: "r.EMPLACEMENT_ID" },
      { queryKey: "state_id", column: "r.STATE_ID" },
      { queryKey: "user_id", column: "r.UTILISTAURE_ID" },
      { queryKey: "external_order_id", column: "r.EXTERNAL_ORDER_ID" },
    ],
    productFilter: { lineTable: RECEPTION_LINE_TABLE, headerFk: "RECEPTION_ID" },
  });
  const result = await runPaginatedQuery({
    baseSql: `${receptionHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY r.DATE_RECEPTION DESC, r.ID DESC",
    query: req.query,
  });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: RECEPTION_LINE_TABLE,
      headerFk: "RECEPTION_ID",
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.LOT_NUMBER AS lot_label",
        "lines.EXPIRATION_DATE AS expiration_date",
        "lines.INVOICE_QTE AS invoice_qte",
        "lines.RECEPTION_QTE AS reception_qte",
        "lines.PRICE AS price",
        "lines.VAT AS vat",
      ],
      orderBy: "lines.ID ASC",
    },
    result.items.map((row) => row.RECEPTION_ID)
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    lot_label: row.LOT_LABEL,
    expiration_date: row.EXPIRATION_DATE,
    invoice_qte: row.INVOICE_QTE,
    reception_qte: row.RECEPTION_QTE,
    price: row.PRICE,
    vat: row.VAT,
  }));
  res.json({
    items: result.items.map((row) => ({
      reception_id: row.RECEPTION_ID,
      reception_number: row.RECEPTION_NUMBER,
      date_reception: row.DATE_RECEPTION,
      date_liv: row.DATE_LIV,
      date_invoice: row.DATE_INVOICE,
      num_external_delivery: row.NUM_EXTERNAL_DELIVERY,
      num_invoice: row.NUM_INVOICE,
      day_id: row.DAY_ID,
      external_order_id: row.EXTERNAL_ORDER_ID,
      external_order_number: row.EXTERNAL_ORDER_NUMBER,
      emplacement_id: row.EMPLACEMENT_ID,
      emplacement_label: row.EMPLACEMENT_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      user_id: row.USER_ID,
      username: row.USERNAME,
      type_id: row.TYPE_ID,
      type_label: row.TYPE_LABEL,
      lines: grouped.get(row.RECEPTION_ID) || [],
    })),
    pagination: result.pagination,
  });
}

export async function getReceptionById(req, res) {
  const headerResult = await dbQuery(`${receptionHeaderSelect} WHERE r.ID = :id`, { id: req.params.id });
  if (headerResult.rows.length === 0) return res.status(404).json({ message: "Reception not found" });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: RECEPTION_LINE_TABLE,
      headerFk: "RECEPTION_ID",
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.LOT_NUMBER AS lot_label",
        "lines.EXPIRATION_DATE AS expiration_date",
        "lines.INVOICE_QTE AS invoice_qte",
        "lines.RECEPTION_QTE AS reception_qte",
        "lines.PRICE AS price",
        "lines.VAT AS vat",
      ],
      orderBy: "lines.ID ASC",
    },
    [req.params.id]
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    lot_label: row.LOT_LABEL,
    expiration_date: row.EXPIRATION_DATE,
    invoice_qte: row.INVOICE_QTE,
    reception_qte: row.RECEPTION_QTE,
    price: row.PRICE,
    vat: row.VAT,
  }));
  const row = headerResult.rows[0];
  res.json({
    item: {
      reception_id: row.RECEPTION_ID,
      reception_number: row.RECEPTION_NUMBER,
      date_reception: row.DATE_RECEPTION,
      date_liv: row.DATE_LIV,
      date_invoice: row.DATE_INVOICE,
      num_external_delivery: row.NUM_EXTERNAL_DELIVERY,
      num_invoice: row.NUM_INVOICE,
      day_id: row.DAY_ID,
      external_order_id: row.EXTERNAL_ORDER_ID,
      external_order_number: row.EXTERNAL_ORDER_NUMBER,
      emplacement_id: row.EMPLACEMENT_ID,
      emplacement_label: row.EMPLACEMENT_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      user_id: row.USER_ID,
      username: row.USERNAME,
      type_id: row.TYPE_ID,
      type_label: row.TYPE_LABEL,
      lines: grouped.get(row.RECEPTION_ID) || [],
    },
  });
}

export async function listInternalDeliveries(req, res) {
  const { where, binds } = buildFilterClauses(req.query, {
    alias: "idl",
    dateColumn: "idl.DATE_DELIVERY",
    scalarFilters: [
      { queryKey: "location_id", column: "idl.LOCATION_ID" },
      { queryKey: "state_id", column: "idl.STATE_ID" },
      { queryKey: "user_id", column: "idl.UTILISTAURE_ID" },
      { queryKey: "customer_id", column: "idl.CUSTOMER_ID" },
      { queryKey: "internal_order_id", column: "idl.INTERNAL_ORDER_ID" },
    ],
    productFilter: { lineTable: INTERNAL_DELIVERY_LINE_TABLE, headerFk: "INTERNAL_DELIVERY_ID" },
  });
  const result = await runPaginatedQuery({
    baseSql: `${internalDeliveryHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY idl.DATE_DELIVERY DESC, idl.ID DESC",
    query: req.query,
  });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: INTERNAL_DELIVERY_LINE_TABLE,
      headerFk: "INTERNAL_DELIVERY_ID",
      lotJoin: true,
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.LOT_ID AS lot_id",
        "lot.LABEL AS lot_label",
        "lines.QTE AS qte",
        "lines.MISSINGQTE AS missing_qte",
      ],
      orderBy: "lines.ID ASC",
    },
    result.items.map((row) => row.INTERNAL_DELIVERY_ID)
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    lot_id: row.LOT_ID,
    lot_label: row.LOT_LABEL,
    qte: row.QTE,
    missing_qte: row.MISSING_QTE,
  }));
  res.json({
    items: result.items.map((row) => ({
      internal_delivery_id: row.INTERNAL_DELIVERY_ID,
      delivery_number: row.DELIVERY_NUMBER,
      date_delivery: row.DATE_DELIVERY,
      customer_id: row.CUSTOMER_ID,
      customer_label: row.CUSTOMER_LABEL,
      day_id: row.DAY_ID,
      internal_order_id: row.INTERNAL_ORDER_ID,
      internal_order_number: row.INTERNAL_ORDER_NUMBER,
      location_id: row.LOCATION_ID,
      location_label: row.LOCATION_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      user_id: row.USER_ID,
      username: row.USERNAME,
      lines: grouped.get(row.INTERNAL_DELIVERY_ID) || [],
    })),
    pagination: result.pagination,
  });
}

export async function getInternalDeliveryById(req, res) {
  const headerResult = await dbQuery(`${internalDeliveryHeaderSelect} WHERE idl.ID = :id`, { id: req.params.id });
  if (headerResult.rows.length === 0) return res.status(404).json({ message: "Internal delivery not found" });
  const lines = await getLinesByHeaderIds(
    {
      lineTable: INTERNAL_DELIVERY_LINE_TABLE,
      headerFk: "INTERNAL_DELIVERY_ID",
      lotJoin: true,
      extraColumns: [
        "lines.PRODUCT_ID AS product_id",
        "p.LIB AS product_lib",
        "lines.LOT_ID AS lot_id",
        "lot.LABEL AS lot_label",
        "lines.QTE AS qte",
        "lines.MISSINGQTE AS missing_qte",
      ],
      orderBy: "lines.ID ASC",
    },
    [req.params.id]
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    lot_id: row.LOT_ID,
    lot_label: row.LOT_LABEL,
    qte: row.QTE,
    missing_qte: row.MISSING_QTE,
  }));
  const row = headerResult.rows[0];
  res.json({
    item: {
      internal_delivery_id: row.INTERNAL_DELIVERY_ID,
      delivery_number: row.DELIVERY_NUMBER,
      date_delivery: row.DATE_DELIVERY,
      customer_id: row.CUSTOMER_ID,
      customer_label: row.CUSTOMER_LABEL,
      day_id: row.DAY_ID,
      internal_order_id: row.INTERNAL_ORDER_ID,
      internal_order_number: row.INTERNAL_ORDER_NUMBER,
      location_id: row.LOCATION_ID,
      location_label: row.LOCATION_LABEL,
      state_id: row.STATE_ID,
      state_label: row.STATE_LABEL,
      user_id: row.USER_ID,
      username: row.USERNAME,
      lines: grouped.get(row.INTERNAL_DELIVERY_ID) || [],
    },
  });
}
