import { dbQuery } from "../../config/db.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const PRODUCT_TABLE = withSchema("PRODUCT");
const STOCK_TABLE = withSchema("STOCK");
const DISTRIBUTION_TABLE = withSchema("DISTRIBUTION");
const DISTRIBUTION_LINE_TABLE = withSchema("DISTRIBUTION_LINE");
const PRESCRIPTION_TABLE = withSchema("PRESCRIPTION");
const STOCK_MOVEMENT_TABLE = withSchema("STOCK_MOVEMENT");

const KPI_KEYS = {
  TOTAL_PRODUCTS: "total_products",
  TOTAL_STOCK_QTY: "total_stock_qty",
  LOW_STOCK_PRODUCTS: "low_stock_products",
  DISTRIBUTIONS_30D: "distributions_30d",
  DISTRIBUTED_QTY_30D: "distributed_qty_30d",
  PRESCRIPTIONS_30D: "prescriptions_30d",
  STOCK_MOVEMENTS_30D: "stock_movements_30d",
};

const POWERBI_TOPICS = {
  STOCK: "stock",
  CONSUMPTION: "consumption",
  DISTRIBUTION: "distribution",
  MOVEMENTS: "movements",
  INVENTORY: "inventory",
};

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolvePeriodDays(rawDays) {
  const allowed = new Set([7, 30, 90]);
  const parsed = Number(rawDays);
  return allowed.has(parsed) ? parsed : 30;
}

function unique(values) {
  return [...new Set(values)];
}

function resolveAnalyticsScope(roles = []) {
  const roleSet = new Set(roles);
  const isAdmin = roleSet.has("ADMIN");
  const isBiManager = roleSet.has("RESPONSABLE_REPORTING");

  if (isAdmin || isBiManager) {
    return {
      kpiKeys: Object.values(KPI_KEYS),
      powerBiTopics: Object.values(POWERBI_TOPICS),
      canSeeTopProducts: true,
    };
  }

  const kpiKeys = [];
  const powerBiTopics = [];

  if (roleSet.has("MEDECIN")) {
    kpiKeys.push(KPI_KEYS.PRESCRIPTIONS_30D, KPI_KEYS.DISTRIBUTIONS_30D);
    powerBiTopics.push(POWERBI_TOPICS.CONSUMPTION, POWERBI_TOPICS.DISTRIBUTION);
  }

  if (roleSet.has("PREPARATEUR")) {
    kpiKeys.push(KPI_KEYS.DISTRIBUTIONS_30D, KPI_KEYS.DISTRIBUTED_QTY_30D);
    powerBiTopics.push(POWERBI_TOPICS.DISTRIBUTION);
  }

  if (roleSet.has("PHARMACIEN")) {
    kpiKeys.push(
      KPI_KEYS.TOTAL_PRODUCTS,
      KPI_KEYS.TOTAL_STOCK_QTY,
      KPI_KEYS.LOW_STOCK_PRODUCTS,
      KPI_KEYS.DISTRIBUTIONS_30D,
      KPI_KEYS.DISTRIBUTED_QTY_30D,
      KPI_KEYS.PRESCRIPTIONS_30D,
      KPI_KEYS.STOCK_MOVEMENTS_30D
    );
    powerBiTopics.push(
      POWERBI_TOPICS.STOCK,
      POWERBI_TOPICS.CONSUMPTION,
      POWERBI_TOPICS.DISTRIBUTION,
      POWERBI_TOPICS.MOVEMENTS,
      POWERBI_TOPICS.INVENTORY
    );
  }

  if (roleSet.has("GESTIONNAIRE_STOCK")) {
    kpiKeys.push(
      KPI_KEYS.TOTAL_PRODUCTS,
      KPI_KEYS.TOTAL_STOCK_QTY,
      KPI_KEYS.LOW_STOCK_PRODUCTS,
      KPI_KEYS.STOCK_MOVEMENTS_30D
    );
    powerBiTopics.push(POWERBI_TOPICS.STOCK, POWERBI_TOPICS.MOVEMENTS, POWERBI_TOPICS.INVENTORY);
  }

  return {
    kpiKeys: unique(kpiKeys),
    powerBiTopics: unique(powerBiTopics),
    canSeeTopProducts:
      roleSet.has("PHARMACIEN") || roleSet.has("PREPARATEUR") || roleSet.has("MEDECIN"),
  };
}

function pickObject(source, allowedKeys) {
  return Object.fromEntries(allowedKeys.filter((key) => key in source).map((key) => [key, source[key]]));
}

export async function getAnalyticsKpis(req, res) {
  const periodDays = resolvePeriodDays(req.query?.days);
  const lowStockThreshold = 10;
  const scope = resolveAnalyticsScope(Array.isArray(req.user?.roles) ? req.user.roles : []);

  const [
    totalProductsRes,
    totalStockQtyRes,
    lowStockProductsRes,
    distributions30dRes,
    distributedQty30dRes,
    prescriptions30dRes,
    stockMovements30dRes,
    topProductsRes,
  ] = await Promise.all([
    dbQuery(`SELECT COUNT(*) AS total_products FROM ${PRODUCT_TABLE}`),
    dbQuery(`SELECT NVL(SUM(NVL(s.QUANTITY, 0)), 0) AS total_stock_qty FROM ${STOCK_TABLE} s`),
    dbQuery(
      `SELECT COUNT(*) AS low_stock_products
       FROM (
         SELECT s.PRODUIT_ID
         FROM ${STOCK_TABLE} s
         GROUP BY s.PRODUIT_ID
         HAVING SUM(NVL(s.QUANTITY, 0)) <= :threshold
       )`,
      { threshold: lowStockThreshold }
    ),
    dbQuery(
      `SELECT COUNT(*) AS distributions_30d
       FROM ${DISTRIBUTION_TABLE} d
       WHERE d.DATE_DIST >= TRUNC(SYSDATE) - :days`,
      { days: periodDays }
    ),
    dbQuery(
      `SELECT NVL(SUM(NVL(dl.DELIVERED_QT, 0)), 0) AS distributed_qty_30d
       FROM ${DISTRIBUTION_LINE_TABLE} dl
       JOIN ${DISTRIBUTION_TABLE} d ON d.ID = dl.DISTRIBUTION_ID
       WHERE d.DATE_DIST >= TRUNC(SYSDATE) - :days`,
      { days: periodDays }
    ),
    dbQuery(
      `SELECT COUNT(*) AS prescriptions_30d
       FROM ${PRESCRIPTION_TABLE} p
       WHERE p.PRESCRIPTION_DATE >= TRUNC(SYSDATE) - :days`,
      { days: periodDays }
    ),
    dbQuery(
      `SELECT COUNT(*) AS stock_movements_30d
       FROM ${STOCK_MOVEMENT_TABLE} sm
       WHERE sm.DATE_MOVEMENT >= TRUNC(SYSDATE) - :days`,
      { days: periodDays }
    ),
    dbQuery(
      `SELECT *
       FROM (
         SELECT
           p.ID AS product_id,
           p.LIB AS product_lib,
           NVL(SUM(NVL(dl.DELIVERED_QT, 0)), 0) AS delivered_qty
         FROM ${DISTRIBUTION_LINE_TABLE} dl
         JOIN ${DISTRIBUTION_TABLE} d ON d.ID = dl.DISTRIBUTION_ID
         LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = dl.PRODUCT_ID
         WHERE d.DATE_DIST >= TRUNC(SYSDATE) - :days
         GROUP BY p.ID, p.LIB
         ORDER BY delivered_qty DESC NULLS LAST
       )
       WHERE ROWNUM <= :max_rows`,
      { days: periodDays, max_rows: 5 }
    ),
  ]);

  const topProducts = topProductsRes.rows.map((row) => ({
    product_id: row.PRODUCT_ID,
    product_lib: row.PRODUCT_LIB,
    delivered_qty: toSafeNumber(row.DELIVERED_QTY),
  }));

  const allKpis = {
    total_products: toSafeNumber(totalProductsRes.rows[0]?.TOTAL_PRODUCTS),
    total_stock_qty: toSafeNumber(totalStockQtyRes.rows[0]?.TOTAL_STOCK_QTY),
    low_stock_products: toSafeNumber(lowStockProductsRes.rows[0]?.LOW_STOCK_PRODUCTS),
    distributions_30d: toSafeNumber(distributions30dRes.rows[0]?.DISTRIBUTIONS_30D),
    distributed_qty_30d: toSafeNumber(distributedQty30dRes.rows[0]?.DISTRIBUTED_QTY_30D),
    prescriptions_30d: toSafeNumber(prescriptions30dRes.rows[0]?.PRESCRIPTIONS_30D),
    stock_movements_30d: toSafeNumber(stockMovements30dRes.rows[0]?.STOCK_MOVEMENTS_30D),
    low_stock_threshold: lowStockThreshold,
  };

  const visibleKpis = pickObject(allKpis, [...scope.kpiKeys, "low_stock_threshold"]);

  return res.json({
    period_days: periodDays,
    generated_at: new Date().toISOString(),
    kpis: visibleKpis,
    kpi_keys: scope.kpiKeys,
    powerbi_topics: scope.powerBiTopics,
    top_products: scope.canSeeTopProducts ? topProducts : [],
  });
}
