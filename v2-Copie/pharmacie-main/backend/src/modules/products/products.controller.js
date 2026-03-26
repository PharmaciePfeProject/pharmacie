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

const PRODUCT_TABLE = withSchema("PRODUCT");
const DCI_TABLE = withSchema("DCI");
const PHARMA_CLASS_TABLE = withSchema("PHARMA_CLASS");
const TYPE_TABLE = withSchema("TYPE");

const productSelect = `
  SELECT
    p.ID AS product_id,
    p.LIB AS lib,
    p.BAR_CODE AS bar_code,
    p.PRICE AS price,
    p.VAT_RATE AS vat_rate,
    p.WAU_COST AS wau_cost,
    p.MIN_STOCK AS min_stock,
    p.SAFETY_STOCK AS safety_stock,
    p.WARNING_STOCK AS warning_stock,
    NVL(d.LABEL, '') AS dci,
    p.PHARMA_CLASS_ID AS pharma_class_id,
    p.TYPE_ID AS type_id
  FROM ${PRODUCT_TABLE} p
  LEFT JOIN ${DCI_TABLE} d ON d.ID = p.DCI_ID
`;

function buildProductFilters(query) {
  const clauses = [];
  const binds = {};

  if (query.search) {
    clauses.push(
      `(UPPER(p.LIB) LIKE UPPER(:search) OR UPPER(p.BAR_CODE) LIKE UPPER(:search) OR UPPER(NVL(d.LABEL, '')) LIKE UPPER(:search))`
    );
    binds.search = `%${query.search}%`;
  }

  if (query.type_id !== undefined) {
    clauses.push("p.TYPE_ID = :type_id");
    binds.type_id = query.type_id;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getDciId(label) {
  const result = await dbQuery(
    `SELECT ID FROM ${DCI_TABLE} WHERE UPPER(LABEL) = UPPER(:label)`,
    { label }
  );

  if (result.rows.length === 0) {
    const error = new Error("Invalid dci");
    error.status = 400;
    error.details = { dci: "Unknown DCI label" };
    throw error;
  }

  return result.rows[0].ID;
}

async function assertReferenceExists(tableName, id, fieldName) {
  const result = await dbQuery(`SELECT ID FROM ${tableName} WHERE ID = :id`, { id });

  if (result.rows.length === 0) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    error.details = { [fieldName]: "Unknown reference id" };
    throw error;
  }
}

async function getNextProductId() {
  const result = await dbQuery(`SELECT NVL(MAX(ID), 0) + 1 AS NEXT_ID FROM ${PRODUCT_TABLE}`);
  return result.rows[0].NEXT_ID;
}

function mapProductRow(row) {
  return {
    product_id: row.PRODUCT_ID,
    lib: row.LIB,
    bar_code: row.BAR_CODE,
    price: row.PRICE,
    vat_rate: row.VAT_RATE,
    wau_cost: row.WAU_COST,
    min_stock: row.MIN_STOCK,
    safety_stock: row.SAFETY_STOCK,
    warning_stock: row.WARNING_STOCK,
    dci: row.DCI,
    pharma_class_id: row.PHARMA_CLASS_ID,
    type_id: row.TYPE_ID,
  };
}

export async function listProducts(req, res) {
  const { where, binds } = buildProductFilters(req.query);
  const result = await runPaginatedQuery({
    baseSql: `${productSelect}${where}`,
    binds,
    orderBy: "ORDER BY p.ID DESC",
    query: req.query,
  });
  res.json({
    items: result.items.map(mapProductRow),
    pagination: result.pagination,
  });
}

export async function getProductById(req, res) {
  const result = await dbQuery(`${productSelect} WHERE p.ID = :id`, { id: req.params.id });

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json({ item: result.rows[0] });
}

export async function createProduct(req, res) {
  const dciId = await getDciId(req.body.dci);
  await assertReferenceExists(PHARMA_CLASS_TABLE, req.body.pharma_class_id, "pharma_class_id");
  await assertReferenceExists(TYPE_TABLE, req.body.type_id, "type_id");
  const productId = await getNextProductId();

  await dbQuery(
    `INSERT INTO ${PRODUCT_TABLE} (
      ID,
      ACTIVED,
      BAR_CODE,
      CODE_PCT_PROD,
      COLISAGE,
      LIB,
      MIN_STOCK,
      PRICE,
      SAFETY_STOCK,
      VAT_RATE,
      WARNING_STOCK,
      WAU_COST,
      DCI_ID,
      PHARMA_CLASS_ID,
      TYPE_ID
    ) VALUES (
      :product_id,
      1,
      :bar_code,
      :bar_code,
      0,
      :lib,
      :min_stock,
      :price,
      :safety_stock,
      :vat_rate,
      :warning_stock,
      :wau_cost,
      :dci_id,
      :pharma_class_id,
      :type_id
    )`,
    {
      product_id: productId,
      bar_code: req.body.bar_code,
      lib: req.body.lib,
      min_stock: req.body.min_stock,
      price: req.body.price,
      safety_stock: req.body.safety_stock,
      vat_rate: req.body.vat_rate,
      warning_stock: req.body.warning_stock,
      wau_cost: req.body.wau_cost,
      dci_id: dciId,
      pharma_class_id: req.body.pharma_class_id,
      type_id: req.body.type_id,
    }
  );

  const created = await dbQuery(`${productSelect} WHERE p.ID = :id`, { id: productId });
  return res.status(201).json({ item: created.rows[0] });
}

export async function updateProduct(req, res) {
  const existing = await dbQuery(`SELECT ID FROM ${PRODUCT_TABLE} WHERE ID = :id`, {
    id: req.params.id,
  });

  if (existing.rows.length === 0) {
    return res.status(404).json({ message: "Product not found" });
  }

  const dciId = await getDciId(req.body.dci);
  await assertReferenceExists(PHARMA_CLASS_TABLE, req.body.pharma_class_id, "pharma_class_id");
  await assertReferenceExists(TYPE_TABLE, req.body.type_id, "type_id");

  await dbQuery(
    `UPDATE ${PRODUCT_TABLE}
     SET BAR_CODE = :bar_code,
         CODE_PCT_PROD = :bar_code,
         LIB = :lib,
         MIN_STOCK = :min_stock,
         PRICE = :price,
         SAFETY_STOCK = :safety_stock,
         VAT_RATE = :vat_rate,
         WARNING_STOCK = :warning_stock,
         WAU_COST = :wau_cost,
         DCI_ID = :dci_id,
         PHARMA_CLASS_ID = :pharma_class_id,
         TYPE_ID = :type_id
     WHERE ID = :product_id`,
    {
      product_id: req.params.id,
      bar_code: req.body.bar_code,
      lib: req.body.lib,
      min_stock: req.body.min_stock,
      price: req.body.price,
      safety_stock: req.body.safety_stock,
      vat_rate: req.body.vat_rate,
      warning_stock: req.body.warning_stock,
      wau_cost: req.body.wau_cost,
      dci_id: dciId,
      pharma_class_id: req.body.pharma_class_id,
      type_id: req.body.type_id,
    }
  );

  const updated = await dbQuery(`${productSelect} WHERE p.ID = :id`, { id: req.params.id });
  return res.json({ item: updated.rows[0] });
}
