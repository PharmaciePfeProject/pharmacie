import { dbQuery, initDb } from "../../config/db.js";
import { runPaginatedQuery } from "../../utils/pagination.js";
import { getNextIdWithTableLock } from "../../utils/oracleIds.js";

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || "";
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const AGENT_TABLE = withSchema("AGENT");
const PRESCRIPTION_TABLE = withSchema("PRESCRIPTION");
let agentColumnsCache = null;

async function getAgentColumns() {
  if (agentColumnsCache) return agentColumnsCache;

  const schema = getSchemaName();
  let result;
  if (schema) {
    try {
      result = await dbQuery(
        `
          SELECT COLUMN_NAME
          FROM ALL_TAB_COLUMNS
          WHERE OWNER = :owner
            AND TABLE_NAME = :table_name
        `,
        { owner: schema, table_name: "AGENT" }
      );
    } catch {
      result = null;
    }
  }

  if (!result) {
    result = await dbQuery(
      `
        SELECT COLUMN_NAME
        FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME = :table_name
      `,
      { table_name: "AGENT" }
    );
  }

  const set = new Set((result.rows || []).map((row) => String(row.COLUMN_NAME || "").toUpperCase()));
  agentColumnsCache = set;
  return set;
}

function columnOrNull(columns, columnName, alias) {
  const upper = String(columnName || "").toUpperCase();
  return columns.has(upper) ? `a.${upper} AS ${alias}` : `NULL AS ${alias}`;
}

async function buildAgentSelectSql({ where = "" } = {}) {
  const columns = await getAgentColumns();
  const selectCols = [
    columnOrNull(columns, "ID", "ID"),
    columnOrNull(columns, "NAME", "NAME"),
    columnOrNull(columns, "SITUATION", "SITUATION"),
    columnOrNull(columns, "PHONE_NUMBER", "PHONE_NUMBER"),
    columnOrNull(columns, "ADDRESS", "ADDRESS"),
    columnOrNull(columns, "START_DATE", "START_DATE"),
    columnOrNull(columns, "END_DATE", "END_DATE"),
    columnOrNull(columns, "POSITION", "POSITION"),
    columnOrNull(columns, "EMAIL", "EMAIL"),
    columnOrNull(columns, "SALARY", "SALARY"),
    columnOrNull(columns, "STATUS", "STATUS"),
    columnOrNull(columns, "CIN", "CIN"),
    columnOrNull(columns, "CREATED_AT", "CREATED_AT"),
    columnOrNull(columns, "UPDATED_AT", "UPDATED_AT"),
  ];

  return `
    SELECT
      ${selectCols.join(",\n      ")}
    FROM ${AGENT_TABLE} a
    ${where}
  `;
}

function mapAgent(row) {
  return {
    agent_id: row.ID,
    agent_name: row.NAME,
    agent_situation: row.SITUATION,
    agent_phone_number: row.PHONE_NUMBER,
    agent_address: row.ADDRESS,
    agent_start_date: row.START_DATE,
    agent_end_date: row.END_DATE,
    agent_position: row.POSITION,
    agent_email: row.EMAIL,
    agent_salary: row.SALARY,
    agent_status: row.STATUS,
    agent_cin: row.CIN,
    created_at: row.CREATED_AT,
    updated_at: row.UPDATED_AT,
  };
}

function buildAgentFilters(query) {
  const clauses = [];
  const binds = {};

  if (query.search) {
    clauses.push(
      `(UPPER(a.NAME) LIKE UPPER(:search) OR UPPER(NVL(a.SITUATION, '')) LIKE UPPER(:search))`
    );
    binds.search = `%${query.search}%`;
  }

  if (query.agent_id !== undefined) {
    clauses.push("a.ID = :agent_id");
    binds.agent_id = query.agent_id;
  }

  return {
    where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
    binds,
  };
}

export async function listAgents(req, res) {
  try {
    const { where, binds } = buildAgentFilters(req.query);
    const baseSql = await buildAgentSelectSql({ where });

    const result = await runPaginatedQuery({
      baseSql,
      binds,
      orderBy: "ORDER BY a.ID DESC",
      query: req.query,
    });

    // Fallback for older datasets where AGENT table is empty:
    // recover distinct agents from prescription headers.
    if ((result.items || []).length === 0) {
      try {
        const fallbackRows = await dbQuery(
          `SELECT
             p.AGENT_ID AS ID,
             MAX(p.AGENT_SITUATION) KEEP (
               DENSE_RANK LAST ORDER BY p.PRESCRIPTION_DATE NULLS LAST, p.ID
             ) AS NAME,
             MAX(p.AGENT_SITUATION) KEEP (
               DENSE_RANK LAST ORDER BY p.PRESCRIPTION_DATE NULLS LAST, p.ID
             ) AS SITUATION
           FROM ${PRESCRIPTION_TABLE} p
           WHERE p.AGENT_ID IS NOT NULL
           GROUP BY p.AGENT_ID
           ORDER BY p.AGENT_ID DESC
           FETCH FIRST 300 ROWS ONLY`
        );

        if ((fallbackRows.rows || []).length > 0) {
          return res.json({
            items: fallbackRows.rows.map((row) => ({
              agent_id: row.ID,
              agent_name: row.NAME,
              agent_situation: row.SITUATION,
              agent_phone_number: null,
              agent_address: null,
              agent_start_date: null,
              agent_end_date: null,
              agent_position: null,
              agent_email: null,
              agent_salary: null,
              agent_status: null,
              agent_cin: null,
              created_at: null,
              updated_at: null,
            })),
            pagination: {
              page: 1,
              pageSize: fallbackRows.rows.length,
              total: fallbackRows.rows.length,
              totalPages: 1,
            },
            source: "prescription_fallback",
          });
        }
      } catch (fallbackError) {
        // Keep original empty response if fallback source is unavailable.
        if (fallbackError?.errorNum !== 942) {
          console.warn("Agents fallback query failed:", fallbackError?.message);
        }
      }
    }

    return res.json({
      items: result.items.map(mapAgent),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error listing agents:", error);
    return res.status(500).json({
      message: "Error listing agents",
      error: error.message,
    });
  }
}

export async function getAgentById(req, res) {
  try {
    const { agent_id } = req.params;
    const baseSql = await buildAgentSelectSql({ where: "WHERE a.ID = :agent_id" });

    const result = await dbQuery(baseSql, { agent_id });

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        message: "Agent not found",
      });
    }

    return res.json(mapAgent(result.rows[0]));
  } catch (error) {
    console.error("Error getting agent:", error);
    return res.status(500).json({
      message: "Error getting agent",
      error: error.message,
    });
  }
}

export async function createAgent(req, res) {
  const {
    agent_name,
    agent_situation,
    agent_phone_number,
    agent_address,
    agent_start_date,
    agent_end_date,
    agent_position,
    agent_email,
    agent_salary,
    agent_status,
    agent_cin,
  } = req.body;

  const normalizedStatus = String(agent_status || "").trim();
  const normalizedEndDate = normalizedStatus === "Actif" ? null : agent_end_date || null;

  if (!agent_name) {
    return res.status(400).json({
      message: "agent_name is required",
    });
  }

  console.log("Creating agent with payload:", {
    agent_name,
    agent_phone_number,
    agent_address,
    agent_cin,
    agent_status: normalizedStatus,
  });

  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const agentId = await getNextIdWithTableLock(conn, AGENT_TABLE);
    console.log("Generated agent ID:", agentId);

    // Parse dates properly - handle empty strings and null values
    const parsedStartDate = agent_start_date && agent_start_date.trim() ? agent_start_date : null;
    const parsedEndDate = normalizedEndDate && normalizedEndDate.trim ? normalizedEndDate.trim() : null;
    const parsedSalary = agent_salary && !isNaN(agent_salary) ? Number(agent_salary) : null;

    const binds = {
      id: agentId,
      name: agent_name,
      situation: agent_situation || null,
      phone_number: agent_phone_number || null,
      address: agent_address || null,
      position: agent_position || null,
      email: agent_email || null,
      salary: parsedSalary,
      status: normalizedStatus,
      cin: agent_cin || null,
    };

    let insertSQL = `INSERT INTO ${AGENT_TABLE} (
         ID,
         NAME,
         SITUATION,
         PHONE_NUMBER,
         ADDRESS,
         POSITION,
         EMAIL,
         SALARY,
         STATUS,
         CIN,
         CREATED_AT,
         UPDATED_AT`;

    let valuesSQL = `     :id,
         :name,
         :situation,
         :phone_number,
         :address,
         :position,
         :email,
         :salary,
         :status,
         :cin,
         SYSTIMESTAMP,
         SYSTIMESTAMP`;

    if (parsedStartDate) {
      insertSQL += `,
         START_DATE`;
      valuesSQL += `,
         TO_DATE(:start_date, 'YYYY-MM-DD')`;
      binds.start_date = parsedStartDate;
    }

    if (parsedEndDate) {
      insertSQL += `,
         END_DATE`;
      valuesSQL += `,
         TO_DATE(:end_date, 'YYYY-MM-DD')`;
      binds.end_date = parsedEndDate;
    }

    insertSQL += `
       ) VALUES (
         ${valuesSQL}
       )`;

    console.log("Insert SQL:", insertSQL);
    console.log("Binds:", binds);

    await conn.execute(insertSQL, binds, { autoCommit: true });

    console.log("Agent created successfully with ID:", agentId);

    return res.status(201).json({
      agent_id: agentId,
      agent_name,
      agent_situation: agent_situation || null,
      agent_phone_number: agent_phone_number || null,
      agent_address: agent_address || null,
      agent_start_date: parsedStartDate,
      agent_end_date: parsedEndDate,
      agent_position: agent_position || null,
      agent_email: agent_email || null,
      agent_salary: parsedSalary,
      agent_status: normalizedStatus,
      agent_cin: agent_cin || null,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      action: error.action,
    });
    return res.status(500).json({
      message: "Error creating agent",
      error: error.message,
      details: error.sqlState ? `SQL Error: ${error.sqlState}` : undefined,
    });
  } finally {
    await conn.close();
  }
}

export async function updateAgent(req, res) {
  try {
    const { agent_id } = req.params;
    const {
      agent_name,
      agent_situation,
      agent_phone_number,
      agent_address,
      agent_start_date,
      agent_end_date,
      agent_position,
      agent_email,
      agent_salary,
      agent_status,
      agent_cin,
    } = req.body;

    const normalizedStatus = typeof agent_status === "string" ? agent_status.trim() : agent_status;

    // Check if agent exists
    const existResult = await dbQuery(
      `SELECT ID FROM ${AGENT_TABLE} WHERE ID = :agent_id`,
      { agent_id }
    );

    if (!existResult.rows || existResult.rows.length === 0) {
      return res.status(404).json({
        message: "Agent not found",
      });
    }

    const updates = [];
    const binds = { agent_id };

    if (agent_name !== undefined) {
      updates.push("NAME = :name");
      binds.name = agent_name;
    }

    if (agent_situation !== undefined) {
      updates.push("SITUATION = :situation");
      binds.situation = agent_situation;
    }

    if (agent_phone_number !== undefined) {
      updates.push("PHONE_NUMBER = :phone_number");
      binds.phone_number = agent_phone_number;
    }

    if (agent_address !== undefined) {
      updates.push("ADDRESS = :address");
      binds.address = agent_address;
    }

    if (agent_start_date !== undefined && agent_start_date) {
      updates.push("START_DATE = TO_DATE(:start_date, 'YYYY-MM-DD')");
      binds.start_date = agent_start_date;
    }

    if (agent_position !== undefined) {
      updates.push("POSITION = :position");
      binds.position = agent_position;
    }

    if (agent_email !== undefined) {
      updates.push("EMAIL = :email");
      binds.email = agent_email;
    }

    if (agent_salary !== undefined) {
      updates.push("SALARY = :salary");
      binds.salary = agent_salary && !isNaN(agent_salary) ? Number(agent_salary) : null;
    }

    if (agent_status !== undefined) {
      updates.push("STATUS = :status");
      binds.status = normalizedStatus;
      if (normalizedStatus === "Actif") {
        updates.push("END_DATE = NULL");
      } else if (agent_end_date !== undefined && agent_end_date) {
        updates.push("END_DATE = TO_DATE(:end_date, 'YYYY-MM-DD')");
        binds.end_date = agent_end_date;
      }
    } else if (agent_end_date !== undefined && agent_end_date) {
      updates.push("END_DATE = TO_DATE(:end_date, 'YYYY-MM-DD')");
      binds.end_date = agent_end_date;
    }

    if (agent_cin !== undefined) {
      updates.push("CIN = :cin");
      binds.cin = agent_cin;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No fields to update",
      });
    }

    updates.push("UPDATED_AT = SYSTIMESTAMP");

    await dbQuery(
      `UPDATE ${AGENT_TABLE} SET ${updates.join(", ")} WHERE ID = :agent_id`,
      binds
    );

    // Fetch updated agent
    const result = await dbQuery(
      `SELECT
         ID,
         NAME,
         SITUATION,
         PHONE_NUMBER,
         ADDRESS,
         START_DATE,
         END_DATE,
         POSITION,
         EMAIL,
         SALARY,
         STATUS,
         CIN,
         CREATED_AT,
         UPDATED_AT
       FROM ${AGENT_TABLE}
       WHERE ID = :agent_id`,
      { agent_id }
    );

    return res.json(mapAgent(result.rows[0]));
  } catch (error) {
    console.error("Error updating agent:", error);
    return res.status(500).json({
      message: "Error updating agent",
      error: error.message,
    });
  }
}

export async function deleteAgent(req, res) {
  try {
    const { agent_id } = req.params;

    // Check if agent exists
    const existResult = await dbQuery(
      `SELECT ID FROM ${AGENT_TABLE} WHERE ID = :agent_id`,
      { agent_id }
    );

    if (!existResult.rows || existResult.rows.length === 0) {
      return res.status(404).json({
        message: "Agent not found",
      });
    }

    await dbQuery(`DELETE FROM ${AGENT_TABLE} WHERE ID = :agent_id`, {
      agent_id,
    });

    return res.json({
      message: "Agent deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return res.status(500).json({
      message: "Error deleting agent",
      error: error.message,
    });
  }
}
