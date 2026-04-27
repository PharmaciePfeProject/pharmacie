import { dbQuery, initDb } from "../../config/db.js";
import { chunkValues } from "../../utils/oracle.js";
import { getNextIdWithTableLock } from "../../utils/oracleIds.js";
import { runPaginatedQuery } from "../../utils/pagination.js";
import { ROLE_KEYS, PERMISSIONS } from "../../utils/rbac.js";
import {
  clearAssignedDepot,
  ensurePharmacistDepotTable,
  ensureUserHasDepotOrThrow,
  getAssignedDepotByUserId,
} from "../../utils/pharmacistDepots.js";

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
const REFERENCE_TYPE_TABLE = withSchema("REFERENCE_TYPE");
const INTERNAL_ORDER_APPROVAL_TABLE = withSchema("INTERNAL_ORDER_APPROVAL");
const INTERNAL_ORDER_APPROVAL_LINE_TABLE = withSchema("INTERNAL_ORDER_APPROVAL_LINE");
const EXTERNAL_ORDER_INVOICE_TABLE = withSchema("EXTERNAL_ORDER_INVOICE");
const EXTERNAL_ORDER_INVOICE_LINE_TABLE = withSchema("EXTERNAL_ORDER_INVOICE_LINE");
const STOCK_TABLE = withSchema("STOCK");
const STOCK_MOVEMENT_TABLE = withSchema("STOCK_MOVEMENT");
const STOCK_MOVEMENT_LINE_TABLE = withSchema("STOCK_MOVEMENT_LINE");
const EXTERNAL_DEPOT_ID = 2;
const INTERNAL_APPROVER_DEPOT_ID = 2;

let internalOrderApprovalTableReady = false;
let externalOrderInvoiceTableReady = false;

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

async function ensureWritableSupplyTables() {
  if (!internalOrderApprovalTableReady) {
    try {
      await dbQuery(`SELECT 1 FROM ${INTERNAL_ORDER_APPROVAL_TABLE} WHERE 1 = 0`);
      internalOrderApprovalTableReady = true;
    } catch (error) {
      if (error?.errorNum !== 942) {
        throw error;
      }

      await dbQuery(`
        CREATE TABLE ${INTERNAL_ORDER_APPROVAL_TABLE} (
          ID NUMBER PRIMARY KEY,
          INTERNAL_ORDER_ID NUMBER NOT NULL UNIQUE,
          REQUESTED_DEPOT_ID NUMBER NOT NULL,
          SUPPLY_DEPOT_ID NUMBER,
          REQUESTED_BY_USER_ID NUMBER,
          DECIDED_BY_USER_ID NUMBER,
          STATUS VARCHAR2(20 CHAR) DEFAULT 'PENDING' NOT NULL,
          REQUESTED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
          DECIDED_AT TIMESTAMP,
          NOTES VARCHAR2(1000 CHAR),
          CONSTRAINT CK_INTERNAL_ORDER_APPROVAL_STATUS CHECK (STATUS IN ('PENDING', 'APPROVED', 'REJECTED'))
        )
      `);

      try {
        await dbQuery(
          `CREATE INDEX IDX_INTERNAL_ORDER_APPROVAL_STATUS ON ${INTERNAL_ORDER_APPROVAL_TABLE} (STATUS, SUPPLY_DEPOT_ID)`
        );
      } catch (indexError) {
        if (indexError?.errorNum !== 955) {
          throw indexError;
        }
      }

      internalOrderApprovalTableReady = true;
    }
  }

  try {
    await dbQuery(`SELECT 1 FROM ${INTERNAL_ORDER_APPROVAL_LINE_TABLE} WHERE 1 = 0`);
  } catch (error) {
    if (error?.errorNum !== 942) {
      throw error;
    }

    await dbQuery(`
      CREATE TABLE ${INTERNAL_ORDER_APPROVAL_LINE_TABLE} (
        ID NUMBER PRIMARY KEY,
        APPROVAL_ID NUMBER NOT NULL,
        PRODUCT_ID NUMBER NOT NULL,
        REQUESTED_QTE NUMBER NOT NULL,
        APPROVED_QTE NUMBER NOT NULL,
        AVAILABLE_QTE NUMBER
      )
    `);
  }

  if (!externalOrderInvoiceTableReady) {
    try {
      await dbQuery(`SELECT 1 FROM ${EXTERNAL_ORDER_INVOICE_TABLE} WHERE 1 = 0`);
      externalOrderInvoiceTableReady = true;
    } catch (error) {
      if (error?.errorNum !== 942) {
        throw error;
      }

      await dbQuery(`
        CREATE TABLE ${EXTERNAL_ORDER_INVOICE_TABLE} (
          ID NUMBER PRIMARY KEY,
          EXTERNAL_ORDER_ID NUMBER NOT NULL UNIQUE,
          DEPOT_ID NUMBER NOT NULL,
          SUPPLIER_LABEL VARCHAR2(255 CHAR) NOT NULL,
          INVOICE_NUMBER VARCHAR2(100 CHAR) NOT NULL,
          INVOICE_DATE TIMESTAMP NOT NULL,
          DELIVERY_NUMBER VARCHAR2(100 CHAR),
          TOTAL_AMOUNT NUMBER,
          NOTES VARCHAR2(1000 CHAR),
          REGISTERED_BY_USER_ID NUMBER,
          REGISTERED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
        )
      `);

      await dbQuery(`
        CREATE TABLE ${EXTERNAL_ORDER_INVOICE_LINE_TABLE} (
          ID NUMBER PRIMARY KEY,
          INVOICE_ID NUMBER NOT NULL,
          PRODUCT_ID NUMBER NOT NULL,
          ORDER_QTE NUMBER NOT NULL,
          INVOICE_QTE NUMBER NOT NULL,
          PRICE NUMBER,
          VAT_RATE NUMBER,
          LOT_NUMBER VARCHAR2(100 CHAR),
          EXPIRATION_DATE TIMESTAMP,
          LINE_TOTAL NUMBER
        )
      `);

      try {
        await dbQuery(
          `CREATE INDEX IDX_EXTERNAL_INVOICE_ORDER ON ${EXTERNAL_ORDER_INVOICE_TABLE} (EXTERNAL_ORDER_ID, DEPOT_ID)`
        );
      } catch (indexError) {
        if (indexError?.errorNum !== 955) {
          throw indexError;
        }
      }

      externalOrderInvoiceTableReady = true;
    }
  }
}

async function getStateIdByLabel(label) {
  const result = await dbQuery(
    `SELECT ID AS state_id FROM ${STATE_TABLE} WHERE UPPER(TYPE) = UPPER(:label)`,
    { label },
  );

  if (result.rows.length > 0) {
    return result.rows[0].STATE_ID;
  }

  const fallback = await dbQuery(`SELECT MIN(ID) AS state_id FROM ${STATE_TABLE}`);
  return fallback.rows[0].STATE_ID;
}

async function getReferenceTypeIdByLabel(label) {
  const result = await dbQuery(
    `SELECT ID AS reference_type_id FROM ${REFERENCE_TYPE_TABLE} WHERE UPPER(LABEL) = UPPER(:label)`,
    { label },
  );

  if (result.rows.length > 0) {
    return result.rows[0].REFERENCE_TYPE_ID;
  }

  const fallback = await dbQuery(`SELECT MIN(ID) AS reference_type_id FROM ${REFERENCE_TYPE_TABLE}`);
  return fallback.rows[0].REFERENCE_TYPE_ID;
}

async function getPharmacyLocationId() {
  const result = await dbQuery(
    `SELECT ID AS location_id
     FROM ${LOCATION_TABLE}
     WHERE UPPER(TRIM(LIB)) = 'PHARMACIE'
     ORDER BY ID ASC`,
  );

  if (result.rows.length > 0) {
    return Number(result.rows[0].LOCATION_ID);
  }

  const error = new Error("Default PHARMACIE location is missing.");
  error.status = 409;
  throw error;
}

async function getExternalDepotId() {
  const result = await dbQuery(
    `SELECT ID AS location_id
     FROM ${LOCATION_TABLE}
     WHERE ID = :id`,
    { id: EXTERNAL_DEPOT_ID },
  );

  if (result.rows.length > 0) {
    return EXTERNAL_DEPOT_ID;
  }

  const error = new Error(`External depot ${EXTERNAL_DEPOT_ID} is missing.`);
  error.status = 409;
  throw error;
}

async function getRestrictedDepotId(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isPharmacist = roles.includes(ROLE_KEYS.PHARMACIEN);
  const isAdmin = roles.includes(ROLE_KEYS.ADMIN);

  if (!isPharmacist || isAdmin) {
    return null;
  }

  const pharmacistFunction = String(user?.functionName ?? user?.function ?? "")
    .trim()
    .toUpperCase();

  if (pharmacistFunction !== "DEPOT" && pharmacistFunction !== "PHARMACIST") {
    return null;
  }

  const assignedDepot = await ensureUserHasDepotOrThrow(user);
  return assignedDepot.locationId;
}

function buildOrderLines(rawLines = []) {
  return rawLines.map((line) => ({
    productId: Number(line.product_id),
    quantity: Number(
      line.order_qte ?? line.invoice_qte ?? line.approved_qte ?? line.qte ?? 0,
    ),
    price: line.price !== undefined ? Number(line.price) : null,
    vatRate: line.vat_rate !== undefined ? Number(line.vat_rate) : null,
    lotNumber: line.lot_number ? String(line.lot_number).trim() : null,
    expirationDate: line.expiration_date || null,
  }));
}

function normalizeOracleTimestampTz(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value).trim();
  if (/\.\d{1,3}[+-]\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  return text.replace(/([+-]\d{2}:\d{2})$/, ".000$1");
}

async function loadStockQuantity(conn, locationId, productId) {
  const result = await conn.execute(
    `SELECT ID, QUANTITY, LOCKER
     FROM ${STOCK_TABLE}
     WHERE EMPLACEMENT_ID = :location_id
       AND PRODUIT_ID = :product_id
     FOR UPDATE`,
    { location_id: locationId, product_id: productId },
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function upsertStockQuantity(conn, { locationId, productId, delta }) {
  const current = await loadStockQuantity(conn, locationId, productId);

  if (!current) {
    if (delta < 0) {
      const error = new Error("Not enough stock to fulfill the request.");
      error.status = 409;
      throw error;
    }

    const nextId = await getNextIdWithTableLock(conn, STOCK_TABLE);
    await conn.execute(
      `INSERT INTO ${STOCK_TABLE} (ID, LOCKER, QUANTITY, EMPLACEMENT_ID, PRODUIT_ID)
       VALUES (:id, NULL, :quantity, :location_id, :product_id)`,
      {
        id: nextId,
        quantity: delta,
        location_id: locationId,
        product_id: productId,
      },
      { autoCommit: false },
    );
    return { previousQuantity: 0, nextQuantity: delta };
  }

  const nextQuantity = Number(current.QUANTITY) + delta;
  if (nextQuantity < 0) {
    const error = new Error("Not enough stock to fulfill the request.");
    error.status = 409;
    throw error;
  }

  await conn.execute(
    `UPDATE ${STOCK_TABLE}
     SET QUANTITY = :quantity
     WHERE ID = :id`,
    { quantity: nextQuantity, id: current.ID },
    { autoCommit: false },
  );

  return { previousQuantity: Number(current.QUANTITY), nextQuantity };
}

async function createStockMovement(conn, {
  locationId,
  userId,
  referenceTypeId,
  typeMvt,
  discriminator,
  dayId,
  numMovement,
  lines,
}) {
  const movementId = await getNextIdWithTableLock(conn, STOCK_MOVEMENT_TABLE);
  await conn.execute(
    `INSERT INTO ${STOCK_MOVEMENT_TABLE} (
      ID,
      DATE_MOVEMENT,
      DESCRIMINATOR,
      NUM_MOVEMENT,
      TYPE_MVT,
      DAY_ID,
      DISTRIBUTION_ID,
      INTERNAL_DELIVERY_ID,
      LOCATION_ID,
      RECEPTION_ID,
      REFERENCE_TYPE_ID,
      UTILISTAURE_ID
    ) VALUES (
      :id,
      SYSTIMESTAMP,
      :descriminator,
      :num_movement,
      :type_mvt,
      :day_id,
      NULL,
      NULL,
      :location_id,
      NULL,
      :reference_type_id,
      :user_id
    )`,
    {
      id: movementId,
      descriminator: discriminator,
      num_movement: numMovement,
      type_mvt: typeMvt,
      day_id: dayId || null,
      location_id: locationId,
      reference_type_id: referenceTypeId,
      user_id: userId,
    },
    { autoCommit: false },
  );

  let nextLineId = await getNextIdWithTableLock(conn, STOCK_MOVEMENT_LINE_TABLE);
  for (const line of lines) {
    await conn.execute(
      `INSERT INTO ${STOCK_MOVEMENT_LINE_TABLE} (
        ID,
        DESCRIPTION,
        MOVMENT_QTE,
        LOT_ID,
        MOTIF_ID,
        PRODUCT_ID,
        STOCK_MOVEMENT_ID
      ) VALUES (
        :id,
        :description,
        :movement_qte,
        NULL,
        NULL,
        :product_id,
        :stock_movement_id
      )`,
      {
        id: nextLineId,
        description: line.description || null,
        movement_qte: line.movementQte,
        product_id: line.productId,
        stock_movement_id: movementId,
      },
      { autoCommit: false },
    );
    nextLineId += 1;
  }

  return movementId;
}

async function buildFilterClauses(query, config, user) {
  const clauses = [];
  const binds = {};
  const isPharmacist = Array.isArray(user?.roles) && user.roles.includes(ROLE_KEYS.PHARMACIEN);

  if (config.depotFilter && isPharmacist) {
    const depotId = await getRestrictedDepotId(user);

    if (query[config.depotFilter.queryKey] !== undefined) {
      const requestedDepotId = Number(query[config.depotFilter.queryKey]);
      if (depotId && requestedDepotId !== depotId) {
        const error = new Error("Pharmacien can only view their assigned depot");
        error.status = 403;
        throw error;
      }

      clauses.push(`${config.depotFilter.column} = :${config.depotFilter.queryKey}`);
      binds[config.depotFilter.queryKey] = requestedDepotId;
    } else if (depotId) {
      clauses.push(`${config.depotFilter.column} = :assigned_depot_id`);
      binds.assigned_depot_id = depotId;
    }
  }

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

async function assertDepotAccess(user, locationId) {
  const depotId = await getRestrictedDepotId(user);
  if (depotId && Number(locationId) !== depotId) {
    const error = new Error("Pharmacien can only view their assigned depot");
    error.status = 403;
    throw error;
  }
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
  const { where, binds } = await buildFilterClauses(req.query, {
    alias: "eo",
    dateColumn: "eo.DATE_EXTER_ORDER",
    scalarFilters: [
      { queryKey: "emplacement_id", column: "eo.EMPLACEMENT_ID" },
      { queryKey: "state_id", column: "eo.STATE_ID" },
    ],
    productFilter: { lineTable: EXTERNAL_ORDER_LINE_TABLE, headerFk: "EXTERNAL_ORDER_ID" },
    depotFilter: { queryKey: "emplacement_id", column: "eo.EMPLACEMENT_ID" },
  }, req.user);
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
  await assertDepotAccess(req.user, headerResult.rows[0].EMPLACEMENT_ID);
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
  const { where, binds } = await buildFilterClauses(req.query, {
    alias: "io",
    dateColumn: "io.DATE_ORDER",
    scalarFilters: [
      { queryKey: "emplacement_id", column: "io.EMPLACEMENT_ID" },
      { queryKey: "state_id", column: "io.STATE_ID" },
      { queryKey: "type_id", column: "io.TYPE_ID" },
    ],
    productFilter: { lineTable: INTERNAL_ORDER_LINE_TABLE, headerFk: "INTERNAL_ORDER_ID" },
  }, req.user);
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
  const { where, binds } = await buildFilterClauses(req.query, {
    alias: "r",
    dateColumn: "r.DATE_RECEPTION",
    scalarFilters: [
      { queryKey: "emplacement_id", column: "r.EMPLACEMENT_ID" },
      { queryKey: "state_id", column: "r.STATE_ID" },
      { queryKey: "user_id", column: "r.UTILISTAURE_ID" },
      { queryKey: "external_order_id", column: "r.EXTERNAL_ORDER_ID" },
    ],
    productFilter: { lineTable: RECEPTION_LINE_TABLE, headerFk: "RECEPTION_ID" },
    depotFilter: { queryKey: "emplacement_id", column: "r.EMPLACEMENT_ID" },
  }, req.user);
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
  await assertDepotAccess(req.user, headerResult.rows[0].EMPLACEMENT_ID);
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
  const { where, binds } = await buildFilterClauses(req.query, {
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
    depotFilter: { queryKey: "location_id", column: "idl.LOCATION_ID" },
  }, req.user);
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
  await assertDepotAccess(req.user, headerResult.rows[0].LOCATION_ID);
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

async function assertProductsExist(productIds) {
  const uniqueProductIds = [...new Set(productIds.map((value) => Number(value)).filter(Number.isFinite))];
  if (uniqueProductIds.length === 0) {
    const error = new Error("At least one product is required.");
    error.status = 400;
    throw error;
  }

  const existing = new Set();
  for (const idsChunk of chunkValues(uniqueProductIds)) {
    const bindNames = idsChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(idsChunk.map((id, index) => [`id${index}`, id]));
    const result = await dbQuery(
      `SELECT ID FROM ${PRODUCT_TABLE} WHERE ID IN (${bindNames.map((name) => `:${name}`).join(", ")})`,
      binds,
    );
    for (const row of result.rows) {
      existing.add(Number(row.ID));
    }
  }

  if (existing.size !== uniqueProductIds.length) {
    const error = new Error("One or more products were not found.");
    error.status = 400;
    throw error;
  }
}

function summarizeInternalOrderItem(headerRow, lines) {
  return {
    internal_order_id: headerRow.INTERNAL_ORDER_ID,
    order_number: headerRow.ORDER_NUMBER,
    order_date: headerRow.ORDER_DATE,
    day_id: headerRow.DAY_ID,
    emplacement_id: headerRow.EMPLACEMENT_ID,
    emplacement_label: headerRow.EMPLACEMENT_LABEL,
    state_id: headerRow.STATE_ID,
    state_label: headerRow.STATE_LABEL,
    type_id: headerRow.TYPE_ID,
    type_label: headerRow.TYPE_LABEL,
    lines,
  };
}

function summarizeExternalOrderItem(headerRow, lines) {
  return {
    external_order_id: headerRow.EXTERNAL_ORDER_ID,
    order_number: headerRow.ORDER_NUMBER,
    order_date: headerRow.ORDER_DATE,
    day_id: headerRow.DAY_ID,
    emplacement_id: headerRow.EMPLACEMENT_ID,
    emplacement_label: headerRow.EMPLACEMENT_LABEL,
    state_id: headerRow.STATE_ID,
    state_label: headerRow.STATE_LABEL,
    lines,
  };
}

async function loadInternalOrderDetails(orderId) {
  const headerResult = await dbQuery(`${internalOrderHeaderSelect} WHERE io.ID = :id`, { id: orderId });
  if (headerResult.rows.length === 0) return null;
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
    [orderId],
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    order_qte: row.ORDER_QTE,
  }));
  return summarizeInternalOrderItem(headerResult.rows[0], grouped.get(orderId) || []);
}

async function loadExternalOrderDetails(orderId) {
  const headerResult = await dbQuery(`${externalOrderHeaderSelect} WHERE eo.ID = :id`, { id: orderId });
  if (headerResult.rows.length === 0) return null;
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
    [orderId],
  );
  const grouped = groupLines(lines, (row) => ({
    line_id: row.LINE_ID,
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    order_qte: row.ORDER_QTE,
    price: row.PRICE,
    vat_rate: row.VAT_RATE,
  }));
  return summarizeExternalOrderItem(headerResult.rows[0], grouped.get(orderId) || []);
}

export async function createInternalOrder(req, res) {
  await ensureWritableSupplyTables();

  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isPharmacist = roles.includes(ROLE_KEYS.PHARMACIEN);
  const isAdmin = roles.includes(ROLE_KEYS.ADMIN);
  const pharmacistFunction = String(req.user?.functionName ?? req.user?.function ?? "")
    .trim()
    .toUpperCase();

  if (!isPharmacist || isAdmin || pharmacistFunction !== "PRESCRIPTIONS") {
    return res.status(403).json({ message: "Only pharmacy pharmacists can create internal orders" });
  }

  const effectiveDepotId = await getPharmacyLocationId();
  if (!effectiveDepotId) {
    return res.status(400).json({ message: "Depot is required for internal orders" });
  }

  const lines = buildOrderLines(req.body.lines || []);
  await assertProductsExist(lines.map((line) => line.productId));

  const pool = await initDb();
  const conn = await pool.getConnection();
  let internalOrderId;

  try {
    internalOrderId = await getNextIdWithTableLock(conn, INTERNAL_ORDER_TABLE);
    const orderNumber = `IO-${internalOrderId}`;
    const stateId = await getStateIdByLabel("Brouillon");

    await conn.execute(
      `INSERT INTO ${INTERNAL_ORDER_TABLE} (
        ID, DATE_ORDER, NUM_ORDER, DAY_ID, EMPLACEMENT_ID, STATE_ID, TYPE_ID
      ) VALUES (
        :id, SYSTIMESTAMP, :num_order, :day_id, :emplacement_id, :state_id, :type_id
      )`,
      {
        id: internalOrderId,
        num_order: orderNumber,
        day_id: req.body.day_id || null,
        emplacement_id: effectiveDepotId,
        state_id: stateId,
        type_id: req.body.type_id || null,
      },
      { autoCommit: false },
    );

    let nextLineId = await getNextIdWithTableLock(conn, INTERNAL_ORDER_LINE_TABLE);
    for (const line of lines) {
      await conn.execute(
        `INSERT INTO ${INTERNAL_ORDER_LINE_TABLE} (
          ID, ORDER_QTE, INTERNAL_ORDER_ID, PRODUCT_ID
        ) VALUES (
          :id, :order_qte, :internal_order_id, :product_id
        )`,
        {
          id: nextLineId,
          order_qte: line.quantity,
          internal_order_id: internalOrderId,
          product_id: line.productId,
        },
        { autoCommit: false },
      );
      nextLineId += 1;
    }

    const approvalId = await getNextIdWithTableLock(conn, INTERNAL_ORDER_APPROVAL_TABLE);
    await conn.execute(
      `INSERT INTO ${INTERNAL_ORDER_APPROVAL_TABLE} (
        ID,
        INTERNAL_ORDER_ID,
        REQUESTED_DEPOT_ID,
        SUPPLY_DEPOT_ID,
        REQUESTED_BY_USER_ID,
        DECIDED_BY_USER_ID,
        STATUS,
        REQUESTED_AT,
        NOTES
      ) VALUES (
        :id,
        :internal_order_id,
        :requested_depot_id,
        NULL,
        :requested_by_user_id,
        NULL,
        'PENDING',
        SYSTIMESTAMP,
        NULL
      )`,
      {
        id: approvalId,
        internal_order_id: internalOrderId,
        requested_depot_id: effectiveDepotId,
        requested_by_user_id: req.user?.sub || null,
      },
      { autoCommit: false },
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }

  const item = await loadInternalOrderDetails(internalOrderId);
  return res.status(201).json({ item });
}

export async function createExternalOrder(req, res) {
  await ensureWritableSupplyTables();

  const restrictedDepotId = await getRestrictedDepotId(req.user);
  if (!restrictedDepotId) {
    return res.status(403).json({ message: "Only depot pharmacists can create external orders" });
  }

  const targetDepotId = await getExternalDepotId();
  const requestedDepotId = req.body.emplacement_id !== undefined ? Number(req.body.emplacement_id) : null;
  const effectiveDepotId = targetDepotId;
  if (requestedDepotId && requestedDepotId !== targetDepotId) {
    return res.status(400).json({ message: `External orders must target depot ${targetDepotId}` });
  }

  const lines = buildOrderLines(req.body.lines || []);
  await assertProductsExist(lines.map((line) => line.productId));

  const pool = await initDb();
  const conn = await pool.getConnection();
  let externalOrderId;

  try {
    externalOrderId = await getNextIdWithTableLock(conn, EXTERNAL_ORDER_TABLE);
    const orderNumber = `EO-${externalOrderId}`;
    const stateId = await getStateIdByLabel("Brouillon");

    await conn.execute(
      `INSERT INTO ${EXTERNAL_ORDER_TABLE} (
        ID, DATE_EXTER_ORDER, NUM_EXTERNAL_ORDER, DAY_ID, EMPLACEMENT_ID, STATE_ID
      ) VALUES (
        :id, SYSTIMESTAMP, :num_external_order, :day_id, :emplacement_id, :state_id
      )`,
      {
        id: externalOrderId,
        num_external_order: orderNumber,
        day_id: req.body.day_id || null,
        emplacement_id: effectiveDepotId,
        state_id: stateId,
      },
      { autoCommit: false },
    );

    let nextLineId = await getNextIdWithTableLock(conn, EXTERNAL_ORDER_LINE_TABLE);
    for (const line of lines) {
      await conn.execute(
        `INSERT INTO ${EXTERNAL_ORDER_LINE_TABLE} (
          ID, ORDER_QTE, PRICE, VAT_RATE, EXTERNAL_ORDER_ID, PRODUCT_ID
        ) VALUES (
          :id, :order_qte, :price, :vat_rate, :external_order_id, :product_id
        )`,
        {
          id: nextLineId,
          order_qte: line.quantity,
          price: line.price,
          vat_rate: line.vatRate,
          external_order_id: externalOrderId,
          product_id: line.productId,
        },
        { autoCommit: false },
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

  const item = await loadExternalOrderDetails(externalOrderId);
  return res.status(201).json({ item });
}

export async function decideInternalOrder(req, res) {
  await ensureWritableSupplyTables();
  const approverDepotId = await getRestrictedDepotId(req.user);
  if (!approverDepotId) {
    return res.status(403).json({ message: "Only pharmacists can decide internal orders" });
  }
  if (Number(approverDepotId) !== INTERNAL_APPROVER_DEPOT_ID) {
    return res.status(403).json({
      message: `Only depot ${INTERNAL_APPROVER_DEPOT_ID} pharmacists can approve internal orders`,
    });
  }

  const orderId = Number(req.params.id);
  const decision = String(req.body.decision || "").toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ message: "Decision must be APPROVED or REJECTED" });
  }

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const orderResult = await conn.execute(
      `${internalOrderHeaderSelect} WHERE io.ID = :id FOR UPDATE`,
      { id: orderId },
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Internal order not found" });
    }

    const order = orderResult.rows[0];

    const approvalResult = await conn.execute(
      `SELECT ID, STATUS, REQUESTED_DEPOT_ID, SUPPLY_DEPOT_ID
       FROM ${INTERNAL_ORDER_APPROVAL_TABLE}
       WHERE INTERNAL_ORDER_ID = :id
       FOR UPDATE`,
      { id: orderId },
    );
    if (approvalResult.rows.length === 0) {
      return res.status(404).json({ message: "Internal order approval record not found" });
    }

    const approval = approvalResult.rows[0];
    if (approval.STATUS !== 'PENDING') {
      return res.status(409).json({ message: "This internal order is already processed" });
    }

    if (Number(approval.REQUESTED_DEPOT_ID) === approverDepotId) {
      return res.status(403).json({ message: "A depot cannot approve its own internal order" });
    }

    const orderLines = await getLinesByHeaderIds(
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
      [orderId],
    );

    const requestedLines = orderLines.map((line) => ({
      productId: Number(line.PRODUCT_ID),
      requestedQte: Number(line.ORDER_QTE),
    }));

    const requestedLineOverrides = Array.isArray(req.body.lines) ? req.body.lines : [];
    const overrideByProduct = new Map(
      requestedLineOverrides.map((line) => [Number(line.product_id), Number(line.approved_qte)]),
    );

    const decisionLines = [];

    if (decision === 'APPROVED') {
      for (const requestedLine of requestedLines) {
        const stockRow = await loadStockQuantity(conn, approverDepotId, requestedLine.productId);
        const availableQty = stockRow ? Number(stockRow.QUANTITY) : 0;
        const requestedQty = requestedLine.requestedQte;
        const overrideQty = overrideByProduct.has(requestedLine.productId)
          ? overrideByProduct.get(requestedLine.productId)
          : undefined;
        const approvedQty = Math.max(
          0,
          Math.min(
            Number.isFinite(overrideQty) ? overrideQty : requestedQty,
            availableQty,
          ),
        );

        decisionLines.push({
          productId: requestedLine.productId,
          requestedQte: requestedQty,
          approvedQte: approvedQty,
          availableQte: availableQty,
        });
      }

      const destinationDepotId = Number(approval.REQUESTED_DEPOT_ID);
      const referenceTypeOut = await getReferenceTypeIdByLabel("Sortie Depotb(Ordinaire)");
      const referenceTypeIn = await getReferenceTypeIdByLabel("Entre pharmacie (Ordinaire)");

      for (const line of decisionLines) {
        if (line.approvedQte <= 0) {
          continue;
        }

        await upsertStockQuantity(conn, {
          locationId: approverDepotId,
          productId: line.productId,
          delta: -line.approvedQte,
        });
        await upsertStockQuantity(conn, {
          locationId: destinationDepotId,
          productId: line.productId,
          delta: line.approvedQte,
        });
      }

      const dayId = order.DAY_ID || null;
      const numberSuffix = `IO-${orderId}`;
      const outMovement = await createStockMovement(conn, {
        locationId: approverDepotId,
        userId: req.user?.sub,
        referenceTypeId: referenceTypeOut,
        typeMvt: "SORTIE",
        discriminator: numberSuffix,
        dayId,
        numMovement: `${numberSuffix}-OUT`,
        lines: decisionLines.map((line) => ({
          productId: line.productId,
          movementQte: line.approvedQte,
          description: `Internal order ${orderId} source depot`,
        })),
      });

      const inMovement = await createStockMovement(conn, {
        locationId: destinationDepotId,
        userId: req.user?.sub,
        referenceTypeId: referenceTypeIn,
        typeMvt: "ENTREE",
        discriminator: numberSuffix,
        dayId,
        numMovement: `${numberSuffix}-IN`,
        lines: decisionLines.map((line) => ({
          productId: line.productId,
          movementQte: line.approvedQte,
          description: `Internal order ${orderId} destination depot`,
        })),
      });

      const approvalId = approval.ID;
      let nextDecisionLineId = await getNextIdWithTableLock(conn, INTERNAL_ORDER_APPROVAL_LINE_TABLE);
      for (const line of decisionLines) {
        await conn.execute(
          `INSERT INTO ${INTERNAL_ORDER_APPROVAL_LINE_TABLE} (
            ID,
            APPROVAL_ID,
            PRODUCT_ID,
            REQUESTED_QTE,
            APPROVED_QTE,
            AVAILABLE_QTE
          ) VALUES (
            :id, :approval_id, :product_id, :requested_qte, :approved_qte, :available_qte
          )`,
          {
            id: nextDecisionLineId,
            approval_id: approvalId,
            product_id: line.productId,
            requested_qte: line.requestedQte,
            approved_qte: line.approvedQte,
            available_qte: line.availableQte,
          },
          { autoCommit: false },
        );
        nextDecisionLineId += 1;
      }

      await conn.execute(
        `UPDATE ${INTERNAL_ORDER_APPROVAL_TABLE}
         SET SUPPLY_DEPOT_ID = :supply_depot_id,
             STATUS = 'APPROVED',
             DECIDED_AT = SYSTIMESTAMP,
             DECIDED_BY_USER_ID = :decided_by_user_id,
             NOTES = :notes
         WHERE INTERNAL_ORDER_ID = :internal_order_id`,
        {
          supply_depot_id: approverDepotId,
          decided_by_user_id: req.user?.sub || null,
          notes: req.body.notes || null,
          internal_order_id: orderId,
        },
        { autoCommit: false },
      );

      const totalRequested = requestedLines.reduce((sum, line) => sum + line.requestedQte, 0);
      const totalApproved = decisionLines.reduce((sum, line) => sum + line.approvedQte, 0);
      const finalState = totalApproved < totalRequested ? 'Livré partiellement' : 'Livré';
      const stateId = await getStateIdByLabel(finalState);

      await conn.execute(
        `UPDATE ${INTERNAL_ORDER_TABLE}
         SET STATE_ID = :state_id
         WHERE ID = :id`,
        { state_id: stateId, id: orderId },
        { autoCommit: false },
      );

      await conn.commit();
      const item = await loadInternalOrderDetails(orderId);
      return res.json({
        item,
        decision: {
          status: 'APPROVED',
          approved_by_depot_id: approverDepotId,
          out_movement_id: outMovement,
          in_movement_id: inMovement,
          lines: decisionLines,
        },
      });
    }

    await conn.execute(
      `UPDATE ${INTERNAL_ORDER_APPROVAL_TABLE}
       SET SUPPLY_DEPOT_ID = :supply_depot_id,
           STATUS = 'REJECTED',
           DECIDED_AT = SYSTIMESTAMP,
           DECIDED_BY_USER_ID = :decided_by_user_id,
           NOTES = :notes
       WHERE INTERNAL_ORDER_ID = :internal_order_id`,
      {
        supply_depot_id: approverDepotId,
        decided_by_user_id: req.user?.sub || null,
        notes: req.body.notes || null,
        internal_order_id: orderId,
      },
      { autoCommit: false },
    );

    const stateId = await getStateIdByLabel('Annulé');
    await conn.execute(
      `UPDATE ${INTERNAL_ORDER_TABLE}
       SET STATE_ID = :state_id
       WHERE ID = :id`,
      { state_id: stateId, id: orderId },
      { autoCommit: false },
    );

    await conn.commit();
    const item = await loadInternalOrderDetails(orderId);
    return res.json({
      item,
      decision: {
        status: 'REJECTED',
        approved_by_depot_id: approverDepotId,
      },
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}

export async function listPendingInternalOrderApprovals(req, res) {
  await ensureWritableSupplyTables();

  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isPharmacist = roles.includes(ROLE_KEYS.PHARMACIEN);
  const isAdmin = roles.includes(ROLE_KEYS.ADMIN);
  if (!isPharmacist || isAdmin) {
    return res.status(403).json({ message: "Only pharmacists can review pending internal requests" });
  }

  const approverDepotId = await getRestrictedDepotId(req.user);
  const canValidate = Number(approverDepotId) === INTERNAL_APPROVER_DEPOT_ID;

  const depotFilterClause = canValidate
    ? "AND io.EMPLACEMENT_ID <> :approver_depot_id"
    : "";

  const result = await dbQuery(
    `SELECT
       io.ID AS internal_order_id,
       io.NUM_ORDER AS order_number,
       io.DATE_ORDER AS order_date,
       io.EMPLACEMENT_ID AS requested_depot_id,
       reqLoc.LIB AS requested_depot_label,
       ao.ID AS approval_id,
       ao.REQUESTED_AT AS requested_at,
       ao.REQUESTED_BY_USER_ID AS requested_by_user_id,
       requester.USERNAME AS requester_username,
       requester.FIRSTNAME AS requester_firstname,
       requester.LASTNAME AS requester_lastname
     FROM ${INTERNAL_ORDER_TABLE} io
     INNER JOIN ${INTERNAL_ORDER_APPROVAL_TABLE} ao ON ao.INTERNAL_ORDER_ID = io.ID
     LEFT JOIN ${LOCATION_TABLE} reqLoc ON reqLoc.ID = io.EMPLACEMENT_ID
     LEFT JOIN ${USER_TABLE} requester ON requester.ID = ao.REQUESTED_BY_USER_ID
     WHERE ao.STATUS = 'PENDING'
       ${depotFilterClause}
     ORDER BY ao.REQUESTED_AT ASC, io.ID ASC`,
    canValidate ? { approver_depot_id: approverDepotId } : {},
  );

  return res.json({
    items: result.rows.map((row) => ({
      internal_order_id: row.INTERNAL_ORDER_ID,
      order_number: row.ORDER_NUMBER,
      order_date: row.ORDER_DATE,
      requested_depot_id: row.REQUESTED_DEPOT_ID,
      requested_depot_label: row.REQUESTED_DEPOT_LABEL,
      approval_id: row.APPROVAL_ID,
      requested_at: row.REQUESTED_AT,
      requested_by_user_id: row.REQUESTED_BY_USER_ID,
      requested_by_username: row.REQUESTER_USERNAME,
      requested_by_name: [row.REQUESTER_FIRSTNAME, row.REQUESTER_LASTNAME]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
    })),
  });
}

export async function registerExternalInvoice(req, res) {
  await ensureWritableSupplyTables();

  const invoiceDepotId = await getRestrictedDepotId(req.user);
  if (!invoiceDepotId) {
    return res.status(403).json({ message: "Only pharmacists can register external invoices" });
  }
  const targetDepotId = await getExternalDepotId();

  const orderId = Number(req.params.id);
  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const orderResult = await conn.execute(
      `${externalOrderHeaderSelect} WHERE eo.ID = :id FOR UPDATE`,
      { id: orderId },
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "External order not found" });
    }

    const order = orderResult.rows[0];
    await assertDepotAccess(req.user, order.EMPLACEMENT_ID);
    const deliveryDepotId = targetDepotId;

    const existingInvoice = await conn.execute(
      `SELECT ID FROM ${EXTERNAL_ORDER_INVOICE_TABLE} WHERE EXTERNAL_ORDER_ID = :id`,
      { id: orderId },
    );
    if (existingInvoice.rows.length > 0) {
      return res.status(409).json({ message: "Invoice already registered for this order" });
    }

    const orderLines = await getLinesByHeaderIds(
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
      [orderId],
    );

    const invoiceLinesInput = Array.isArray(req.body.lines) && req.body.lines.length > 0
      ? buildOrderLines(req.body.lines)
      : orderLines.map((line) => ({
          productId: Number(line.PRODUCT_ID),
          quantity: Number(line.ORDER_QTE),
          price: Number(line.PRICE || 0),
          vatRate: Number(line.VAT_RATE || 0),
          lotNumber: null,
          expirationDate: null,
        }));

    const approvalLinesByProduct = new Map(
      orderLines.map((line) => [Number(line.PRODUCT_ID), Number(line.ORDER_QTE)]),
    );

    const invoiceId = await getNextIdWithTableLock(conn, EXTERNAL_ORDER_INVOICE_TABLE);
    const invoiceNumber = req.body.invoice_number || `INV-${invoiceId}`;
    const invoiceDate = normalizeOracleTimestampTz(
      req.body.invoice_date || new Date().toISOString().replace("Z", "+00:00"),
    );
    const deliveryDate = normalizeOracleTimestampTz(req.body.delivery_date || invoiceDate);
    const referenceTypeId = await getReferenceTypeIdByLabel("Reception");

    await conn.execute(
      `INSERT INTO ${EXTERNAL_ORDER_INVOICE_TABLE} (
        ID,
        EXTERNAL_ORDER_ID,
        DEPOT_ID,
        SUPPLIER_LABEL,
        INVOICE_NUMBER,
        INVOICE_DATE,
        DELIVERY_NUMBER,
        TOTAL_AMOUNT,
        NOTES,
        REGISTERED_BY_USER_ID,
        REGISTERED_AT
      ) VALUES (
        :id,
        :external_order_id,
        :depot_id,
        :supplier_label,
        :invoice_number,
        TO_TIMESTAMP_TZ(:invoice_date, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
        :delivery_number,
        :total_amount,
        :notes,
        :registered_by_user_id,
        SYSTIMESTAMP
      )`,
      {
        id: invoiceId,
        external_order_id: orderId,
        depot_id: deliveryDepotId,
        supplier_label: req.body.supplier_label || 'Supplier',
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        delivery_number: req.body.delivery_number || null,
        total_amount: req.body.total_amount || null,
        notes: req.body.notes || null,
        registered_by_user_id: req.user?.sub || null,
      },
      { autoCommit: false },
    );

    let nextLineId = await getNextIdWithTableLock(conn, EXTERNAL_ORDER_INVOICE_LINE_TABLE);
    let totalAmount = 0;
    const receiptLines = [];

    for (const line of invoiceLinesInput) {
      const invoiceQty = line.quantity;
      const orderQty = approvalLinesByProduct.get(line.productId) || invoiceQty;
      const lineAmount = (line.price || 0) * invoiceQty;
      totalAmount += lineAmount;

      await conn.execute(
        `INSERT INTO ${EXTERNAL_ORDER_INVOICE_LINE_TABLE} (
          ID,
          INVOICE_ID,
          PRODUCT_ID,
          ORDER_QTE,
          INVOICE_QTE,
          PRICE,
          VAT_RATE,
          LOT_NUMBER,
          EXPIRATION_DATE,
          LINE_TOTAL
        ) VALUES (
          :id,
          :invoice_id,
          :product_id,
          :order_qte,
          :invoice_qte,
          :price,
          :vat_rate,
          :lot_number,
          CASE WHEN :expiration_date IS NULL THEN NULL ELSE TO_TIMESTAMP_TZ(:expiration_date, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') END,
          :line_total
        )`,
        {
          id: nextLineId,
          invoice_id: invoiceId,
          product_id: line.productId,
          order_qte: orderQty,
          invoice_qte: invoiceQty,
          price: line.price,
          vat_rate: line.vatRate,
          lot_number: line.lotNumber,
          expiration_date: normalizeOracleTimestampTz(line.expirationDate),
          line_total: lineAmount,
        },
        { autoCommit: false },
      );

      await upsertStockQuantity(conn, {
        locationId: deliveryDepotId,
        productId: line.productId,
        delta: invoiceQty,
      });

      receiptLines.push({
        productId: line.productId,
        movementQte: invoiceQty,
        description: `External invoice ${invoiceNumber}`,
      });

      nextLineId += 1;
    }

    await conn.execute(
      `UPDATE ${EXTERNAL_ORDER_INVOICE_TABLE}
       SET TOTAL_AMOUNT = :total_amount
       WHERE ID = :id`,
      { total_amount: totalAmount, id: invoiceId },
      { autoCommit: false },
    );

    const receptionId = await getNextIdWithTableLock(conn, RECEPTION_TABLE);
    const stateId = invoiceLinesInput.some((line) => line.quantity < (approvalLinesByProduct.get(line.productId) || line.quantity))
      ? await getStateIdByLabel('Livré partiellement')
      : await getStateIdByLabel('Livré');
    const receiptNumber = `REC-${receptionId}`;

    await conn.execute(
      `INSERT INTO ${RECEPTION_TABLE} (
        ID,
        DATE_INVOICE,
        DATE_LIV,
        DATE_RECEPTION,
        NUM_EXTERNAL_DELIVERY,
        NUM_INVOICE,
        NUM_RECEPTION,
        TYPE_ID,
        DAY_ID,
        EXTERNAL_ORDER_ID,
        EMPLACEMENT_ID,
        STATE_ID,
        UTILISTAURE_ID
      ) VALUES (
        :id,
        TO_TIMESTAMP_TZ(:date_invoice, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
        TO_TIMESTAMP_TZ(:date_liv, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
        SYSTIMESTAMP,
        :num_external_delivery,
        :num_invoice,
        :num_reception,
        NULL,
        :day_id,
        :external_order_id,
        :emplacement_id,
        :state_id,
        :user_id
      )`,
      {
        id: receptionId,
        date_invoice: invoiceDate,
        date_liv: deliveryDate,
        num_external_delivery: req.body.delivery_number || null,
        num_invoice: invoiceNumber,
        num_reception: receiptNumber,
        day_id: order.DAY_ID || null,
        external_order_id: orderId,
        emplacement_id: deliveryDepotId,
        state_id: stateId,
        user_id: req.user?.sub || null,
      },
      { autoCommit: false },
    );

    let nextReceptionLineId = await getNextIdWithTableLock(conn, RECEPTION_LINE_TABLE);
    for (const line of invoiceLinesInput) {
      await conn.execute(
        `INSERT INTO ${RECEPTION_LINE_TABLE} (
          ID,
          EXPIRATION_DATE,
          INVOICE_QTE,
          LOT_NUMBER,
          PRICE,
          RECEPTION_QTE,
          VAT,
          PRODUCT_ID,
          RECEPTION_ID
        ) VALUES (
          :id,
          CASE WHEN :expiration_date IS NULL THEN NULL ELSE TO_TIMESTAMP_TZ(:expiration_date, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') END,
          :invoice_qte,
          :lot_number,
          :price,
          :reception_qte,
          :vat,
          :product_id,
          :reception_id
        )`,
        {
          id: nextReceptionLineId,
          expiration_date: normalizeOracleTimestampTz(line.expirationDate),
          invoice_qte: line.quantity,
          lot_number: line.lotNumber,
          price: line.price,
          reception_qte: line.quantity,
          vat: line.vatRate,
          product_id: line.productId,
          reception_id: receptionId,
        },
        { autoCommit: false },
      );

      nextReceptionLineId += 1;
    }

    const movementId = await createStockMovement(conn, {
      locationId: deliveryDepotId,
      userId: req.user?.sub,
      referenceTypeId,
      typeMvt: 'ENTREE',
      discriminator: `EO-${orderId}`,
      dayId: order.DAY_ID || null,
      numMovement: `REC-${receptionId}`,
      lines: receiptLines,
    });

    await conn.execute(
      `UPDATE ${EXTERNAL_ORDER_TABLE}
       SET STATE_ID = :state_id,
           EMPLACEMENT_ID = :emplacement_id
       WHERE ID = :id`,
      { state_id: stateId, emplacement_id: deliveryDepotId, id: orderId },
      { autoCommit: false },
    );

    await conn.commit();
    const item = await loadExternalOrderDetails(orderId);
    return res.json({
      item,
      invoice: {
        invoice_id: invoiceId,
        reception_id: receptionId,
        movement_id: movementId,
        total_amount: totalAmount,
      },
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.close();
  }
}
