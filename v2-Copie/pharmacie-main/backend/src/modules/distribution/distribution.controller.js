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

const DISTRIBUTION_TABLE = withSchema("DISTRIBUTION");
const DISTRIBUTION_LINE_TABLE = withSchema("DISTRIBUTION_LINE");
const PRODUCT_TABLE = withSchema("PRODUCT");
const LOCATION_TABLE = withSchema("LOCATION");
const DISTRICT_TABLE = withSchema("DISTRICT");
const USER_TABLE = withSchema("UTILISATEUR");

const distributionHeaderSelect = `
  SELECT
    d.ID AS distribution_id,
    d.DATE_DIST AS date_dist,
    d.DISTRIBUTION_NUMBER AS distribution_number,
    d.DAY_ID AS day_id,
    d.DISTRICT_ID AS district_id,
    district.LIB AS district_label,
    d.EMPLACEMENT_ID AS emplacement_id,
    loc.LIB AS emplacement_label,
    d.UTILISTAURE_ID AS user_id,
    u.USERNAME AS username,
    d.ORDONNANCE_ID AS ordonnance_id
  FROM ${DISTRIBUTION_TABLE} d
  LEFT JOIN ${DISTRICT_TABLE} district ON district.ID = d.DISTRICT_ID
  LEFT JOIN ${LOCATION_TABLE} loc ON loc.ID = d.EMPLACEMENT_ID
  LEFT JOIN ${USER_TABLE} u ON u.ID = d.UTILISTAURE_ID
`;

function buildDistributionFilters(query) {
  const clauses = [];
  const binds = {};

  if (query.product_id !== undefined) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM ${DISTRIBUTION_LINE_TABLE} dl
        WHERE dl.DISTRIBUTION_ID = d.ID
          AND dl.PRODUCT_ID = :product_id
      )`
    );
    binds.product_id = query.product_id;
  }

  if (query.district_id !== undefined) {
    clauses.push("d.DISTRICT_ID = :district_id");
    binds.district_id = query.district_id;
  }

  if (query.emplacement_id !== undefined) {
    clauses.push("d.EMPLACEMENT_ID = :emplacement_id");
    binds.emplacement_id = query.emplacement_id;
  }

  if (query.user_id !== undefined) {
    clauses.push("d.UTILISTAURE_ID = :user_id");
    binds.user_id = query.user_id;
  }

  if (query.date_from !== undefined) {
    clauses.push("d.DATE_DIST >= TO_DATE(:date_from, 'YYYY-MM-DD')");
    binds.date_from = query.date_from;
  }

  if (query.date_to !== undefined) {
    clauses.push("d.DATE_DIST < TO_DATE(:date_to, 'YYYY-MM-DD') + 1");
    binds.date_to = query.date_to;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

async function getDistributionLines(distributionIds) {
  if (distributionIds.length === 0) return [];

  const rows = [];

  for (const distributionIdChunk of chunkValues(distributionIds)) {
    const bindNames = distributionIdChunk.map((_, index) => `id${index}`);
    const binds = Object.fromEntries(distributionIdChunk.map((id, index) => [`id${index}`, id]));

    const result = await dbQuery(
      `
        SELECT
          dl.ID AS line_id,
          dl.DISTRIBUTION_ID AS distribution_id,
          dl.PRODUCT_ID AS product_id,
          p.LIB AS product_lib,
          dl.DELIVERED_QT AS delivered_qt,
          dl.MISSING_QT AS missing_qt,
          dl.TO_DISTRIBUTE AS to_distribute
        FROM ${DISTRIBUTION_LINE_TABLE} dl
        LEFT JOIN ${PRODUCT_TABLE} p ON p.ID = dl.PRODUCT_ID
        WHERE dl.DISTRIBUTION_ID IN (${bindNames.map((name) => `:${name}`).join(", ")})
        ORDER BY dl.DISTRIBUTION_ID DESC, dl.ID ASC
      `,
      binds
    );

    rows.push(...result.rows);
  }

  return rows;
}

function attachLines(headers, lines) {
  const linesByDistributionId = new Map();

  for (const line of lines) {
    const distributionId = line.DISTRIBUTION_ID;
    if (!linesByDistributionId.has(distributionId)) {
      linesByDistributionId.set(distributionId, []);
    }

    linesByDistributionId.get(distributionId).push({
      line_id: line.LINE_ID,
      product_id: line.PRODUCT_ID,
      product_lib: line.PRODUCT_LIB,
      delivered_qt: line.DELIVERED_QT,
      missing_qt: line.MISSING_QT,
      to_distribute: line.TO_DISTRIBUTE,
    });
  }

  return headers.map((header) => ({
    distribution_id: header.DISTRIBUTION_ID,
    date_dist: header.DATE_DIST,
    distribution_number: header.DISTRIBUTION_NUMBER,
    day_id: header.DAY_ID,
    district_id: header.DISTRICT_ID,
    district_label: header.DISTRICT_LABEL,
    emplacement_id: header.EMPLACEMENT_ID,
    emplacement_label: header.EMPLACEMENT_LABEL,
    user_id: header.USER_ID,
    username: header.USERNAME,
    ordonnance_id: header.ORDONNANCE_ID,
    lines: linesByDistributionId.get(header.DISTRIBUTION_ID) || [],
  }));
}

export async function listDistributions(req, res) {
  const { where, binds } = buildDistributionFilters(req.query);
  const result = await runPaginatedQuery({
    baseSql: `${distributionHeaderSelect}${where}`,
    binds,
    orderBy: "ORDER BY d.DATE_DIST DESC, d.ID DESC",
    query: req.query,
  });
  const headers = result.items;
  const lines = await getDistributionLines(headers.map((header) => header.DISTRIBUTION_ID));
  res.json({ items: attachLines(headers, lines), pagination: result.pagination });
}

export async function getDistributionById(req, res) {
  const headerResult = await dbQuery(`${distributionHeaderSelect} WHERE d.ID = :id`, {
    id: req.params.id,
  });

  if (headerResult.rows.length === 0) {
    return res.status(404).json({ message: "Distribution not found" });
  }

  const lines = await getDistributionLines([req.params.id]);
  const [item] = attachLines(headerResult.rows, lines);
  return res.json({ item });
}
